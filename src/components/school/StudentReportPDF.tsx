import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FileDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { CriancaWithRelations, calculateAge, formatDate } from '@/hooks/useSchoolData';

interface StudentReportPDFProps {
  children: CriancaWithRelations[];
  escolaNome?: string;
}

// Format phone number consistently: (XX) XXXXX-XXXX or (XX) XXXX-XXXX
const formatPhoneForPDF = (phone: string | null | undefined): string => {
  if (!phone) return '-';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return phone; // Return as-is if too short
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // For numbers with country code (13 digits like 5521...)
  if (digits.length >= 12) {
    const withoutCountry = digits.slice(-11);
    return `(${withoutCountry.slice(0, 2)}) ${withoutCountry.slice(2, 7)}-${withoutCountry.slice(7)}`;
  }
  return phone;
};

export default function StudentReportPDF({ children, escolaNome }: StudentReportPDFProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [includePhone, setIncludePhone] = useState(true);
  const [includeFinanceiro, setIncludeFinanceiro] = useState(true);
  const [onlyActive, setOnlyActive] = useState(true);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Filter students
      const filteredStudents = onlyActive 
        ? children.filter(c => c.ativo) 
        : children;

      // Group by turma
      const turmaMap = new Map<string, { turma: string; alunos: CriancaWithRelations[] }>();
      
      // Students without turma
      const semTurma: CriancaWithRelations[] = [];
      
      filteredStudents.forEach(student => {
        if (student.turmas.length === 0) {
          semTurma.push(student);
        } else {
          student.turmas.forEach(t => {
            const turmaNome = t.turma?.nome || 'Sem turma';
            if (!turmaMap.has(turmaNome)) {
              turmaMap.set(turmaNome, { turma: turmaNome, alunos: [] });
            }
            const existing = turmaMap.get(turmaNome)!;
            if (!existing.alunos.find(a => a.id === student.id)) {
              existing.alunos.push(student);
            }
          });
        }
      });

      if (semTurma.length > 0) {
        turmaMap.set('Sem turma', { turma: 'Sem turma', alunos: semTurma });
      }

      // Sort turmas alphabetically
      const sortedTurmas = Array.from(turmaMap.values()).sort((a, b) => 
        a.turma === 'Sem turma' ? 1 : b.turma === 'Sem turma' ? -1 : a.turma.localeCompare(b.turma)
      );

      // ===== HEADER =====
      // Background header band
      doc.setFillColor(30, 58, 95); // Primary color
      doc.rect(0, 0, pageWidth, 28, 'F');
      
      // Title
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('Relatório de Atletas', pageWidth / 2, 12, { align: 'center' });
      
      if (escolaNome) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(escolaNome, pageWidth / 2, 19, { align: 'center' });
      }
      
      // Metadata line
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.text(
        `Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })} | Total: ${filteredStudents.length} atletas`,
        pageWidth / 2,
        25,
        { align: 'center' }
      );
      
      doc.setTextColor(0, 0, 0);

      let yPos = 36;

      // ===== FIXED COLUMN WIDTHS =====
      // Calculate fixed widths based on content type (total available: ~269mm in landscape A4 with margins)
      const baseColumns: { [key: string]: number } = {
        '#': 8,
        'Nome': 55,
        'Nascimento': 25,
        'Idade': 18,
        'Responsável': 55,
        'Telefone': 35,
        'Financeiro': 22,
        'Status': 18,
      };

      // Build column config based on options
      const getColumnStyles = () => {
        const styles: { [key: number]: { cellWidth: number; halign?: 'left' | 'center' | 'right' } } = {
          0: { cellWidth: baseColumns['#'], halign: 'center' }, // #
          1: { cellWidth: baseColumns['Nome'], halign: 'left' }, // Nome
          2: { cellWidth: baseColumns['Nascimento'], halign: 'center' }, // Nascimento
          3: { cellWidth: baseColumns['Idade'], halign: 'center' }, // Idade
          4: { cellWidth: baseColumns['Responsável'], halign: 'left' }, // Responsável
        };
        
        let colIndex = 5;
        if (includePhone) {
          styles[colIndex] = { cellWidth: baseColumns['Telefone'], halign: 'center' };
          colIndex++;
        }
        if (includeFinanceiro) {
          styles[colIndex] = { cellWidth: baseColumns['Financeiro'], halign: 'center' };
          colIndex++;
        }
        styles[colIndex] = { cellWidth: baseColumns['Status'], halign: 'center' };
        
        return styles;
      };

      // For each turma
      sortedTurmas.forEach((group) => {
        // Check if we need a new page (leave room for header + at least 3 rows)
        if (yPos > pageHeight - 50) {
          doc.addPage();
          yPos = 15;
        }

        // ===== TURMA HEADER =====
        doc.setFillColor(30, 58, 95);
        doc.roundedRect(14, yPos - 5, pageWidth - 28, 9, 2, 2, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(`${group.turma} (${group.alunos.length} aluno${group.alunos.length !== 1 ? 's' : ''})`, 18, yPos + 1);
        doc.setTextColor(0, 0, 0);
        yPos += 9;

        // Sort students by name
        const sortedAlunos = [...group.alunos].sort((a, b) => a.nome.localeCompare(b.nome));

        // Build table columns
        const columns = ['#', 'Nome', 'Nascimento', 'Idade', 'Responsável'];
        if (includePhone) columns.push('Telefone');
        if (includeFinanceiro) columns.push('Financeiro');
        columns.push('Status');

        // Build table rows
        const rows = sortedAlunos.map((aluno, index) => {
          const responsavel = aluno.responsaveis[0]?.responsavel;
          const finStatus = aluno.financeiroStatus;
          let finText = 'Em dia';
          if (finStatus?.status === 'isento') finText = 'Isento';
          else if (finStatus?.status === 'atrasado') finText = `${finStatus.atrasadas} atraso(s)`;
          else if (finStatus?.status === 'pendente') finText = 'Pendente';

          const row: (string | number)[] = [
            index + 1,
            aluno.nome,
            formatDate(aluno.data_nascimento),
            `${calculateAge(aluno.data_nascimento)} anos`,
            responsavel?.nome || '-',
          ];
          
          if (includePhone) {
            row.push(formatPhoneForPDF(responsavel?.telefone));
          }
          if (includeFinanceiro) {
            row.push(finText);
          }
          row.push(aluno.ativo ? 'Ativo' : 'Inativo');
          
          return row;
        });

        autoTable(doc, {
          startY: yPos,
          head: [columns],
          body: rows,
          theme: 'striped',
          headStyles: {
            fillColor: [71, 85, 105], // Slate-600
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
            cellPadding: 3,
            halign: 'center',
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 2.5,
            valign: 'middle',
          },
          alternateRowStyles: {
            fillColor: [241, 245, 249], // Slate-100
          },
          columnStyles: getColumnStyles(),
          margin: { left: 14, right: 14 },
          tableWidth: 'auto',
          styles: {
            overflow: 'linebreak',
            lineWidth: 0.1,
            lineColor: [200, 200, 200],
          },
          didDrawCell: (data) => {
            // Style financial status with colors
            if (includeFinanceiro) {
              const finColIndex = includePhone ? 6 : 5;
              if (data.section === 'body' && data.column.index === finColIndex) {
                const text = String(data.cell.raw);
                if (text.includes('atraso')) {
                  doc.setTextColor(220, 38, 38); // Red
                } else if (text === 'Pendente') {
                  doc.setTextColor(217, 119, 6); // Amber
                } else if (text === 'Isento') {
                  doc.setTextColor(100, 116, 139); // Slate
                } else {
                  doc.setTextColor(22, 163, 74); // Green
                }
              }
            }
          },
          didParseCell: (data) => {
            // Reset text color after parsing
            if (data.section === 'body') {
              doc.setTextColor(0, 0, 0);
            }
          },
        });

        yPos = (doc as any).lastAutoTable.finalY + 12;
      });

      // ===== FOOTER ON ALL PAGES =====
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${i} de ${pageCount}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' }
        );
        // Footer line
        doc.setDrawColor(200, 200, 200);
        doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
      }

      // Save
      const fileName = `relatorio-atletas-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast.success('Relatório PDF gerado com sucesso!');
      setDialogOpen(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar relatório PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Button variant="outline" onClick={() => setDialogOpen(true)}>
        <FileDown className="w-4 h-4 mr-2" />
        Exportar PDF
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Exportar Relatório de Atletas</DialogTitle>
            <DialogDescription>
              Gere um PDF com a relação de atletas classificados por turma.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="only-active">Apenas alunos ativos</Label>
              <Switch
                id="only-active"
                checked={onlyActive}
                onCheckedChange={setOnlyActive}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="include-phone">Incluir telefone</Label>
              <Switch
                id="include-phone"
                checked={includePhone}
                onCheckedChange={setIncludePhone}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="include-financeiro">Incluir status financeiro</Label>
              <Switch
                id="include-financeiro"
                checked={includeFinanceiro}
                onCheckedChange={setIncludeFinanceiro}
              />
            </div>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
              O relatório será gerado em formato PDF (paisagem A4) com os atletas agrupados por turma e colunas padronizadas.
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={generatePDF} disabled={generating}>
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 mr-2" />
              )}
              Gerar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
