

## Plano de Melhorias: Upload de Foto, Like Otimista e Toggles de Dados

### 1. Foto aparece imediatamente apos upload (sem refresh)

**Problema identificado**: Ao fazer upload da foto no `ProfilePhotoUpload` (dentro do dialog de edição), a imagem atualiza apenas no preview do dialog. O `PerfilHeader` só reflete a mudança após salvar e a query ser invalidada. O browser também pode cachear a URL antiga.

**Solucao**:
- Adicionar um `cache-buster` (`?t=timestamp`) na URL retornada do upload para evitar cache do browser
- Apos o `onSubmit` do `EditPerfilDialog`, garantir que a invalidacao do React Query force o refetch imediato no `PerfilHeader`
- No `PerfilHeader`, ao fazer upload direto pelo botao da camera, usar `setQueryData` para atualizar o cache local instantaneamente (optimistic update), sem esperar o refetch

**Arquivos afetados**:
- `src/hooks/useCarreiraData.ts` - Adicionar cache-buster na `uploadProfilePhoto` e optimistic update no `useUpdatePerfilAtleta`
- `src/components/carreira/PerfilHeader.tsx` - Usar `queryClient.setQueryData` apos upload direto
- `src/components/carreira/ProfilePhotoUpload.tsx` - Adicionar cache-buster na URL do banner

---

### 2. "Gostei" com atualizacao otimista (sem refresh)

**Problema identificado**: O hook `usePostLike` usa `invalidateQueries` no `onSuccess`, o que causa um refetch completo do feed. Isso gera um delay visivel - o usuario clica e nao ve a mudanca instantaneamente.

**Solucao**: Implementar **optimistic update** no hook `usePostLike`:
- Ao clicar em "Gostei", atualizar imediatamente o estado local (`isLiked`) e o contador (`likes_count`) no cache do React Query
- Se a mutacao falhar, reverter o estado anterior (rollback)
- Manter o `invalidateQueries` como fallback para sincronizar com o servidor

**Logica**:
```text
1. Usuario clica "Gostei"
2. Imediatamente: isLiked = true, likes_count + 1 (ou inverso)
3. Envia request ao servidor
4. Se erro: reverte para estado anterior
5. Se sucesso: invalida queries para sync
```

**Arquivo afetado**:
- `src/hooks/useCarreiraData.ts` - Reescrever `usePostLike` com `onMutate` (optimistic) e `onError` (rollback)

---

### 3. Toggles "Dados visiveis" para atletas Carreira

**Problema identificado**: Os toggles de "Gols marcados", "Amistosos", "Campeonatos", etc. aparecem habilitados para todos os perfis, mas atletas vindos do Carreira nao possuem esses dados (pois vem da escolinha via Atleta ID).

**Solucao**: Detectar se o atleta e "Carreira-only" (sem `crianca_id` vinculado a escolinha ativa) e exibir os toggles como **desabilitados** com uma mensagem explicativa.

**Logica de deteccao**:
```text
isCarreiraOnly = perfil.crianca_id existe, MAS nao tem registro ativo em crianca_escolinha
OU perfil.crianca_id nao existe
```

**Visual**: Toggles com `disabled={true}` e uma badge/texto abaixo:
> "Recurso disponivel ao vincular-se a uma escolinha no Atleta ID"

**Arquivo afetado**:
- `src/components/carreira/EditPerfilDialog.tsx` - Adicionar verificacao de vinculo escolar e condicional nos toggles

---

### 4. Estrategia de Conexao Carreira <-> Atleta ID

**Conceito**: Quando um atleta que se cadastrou pelo Carreira passa a treinar em uma escolinha que usa o Atleta ID, o sistema precisa "plugar" ele.

**Fluxo proposto**:
1. A escola cadastra o aluno normalmente (cria `crianca` + `crianca_escolinha`)
2. No cadastro, a escola informa o **CPF do responsavel** (que ja existe no Carreira)
3. O sistema detecta que esse CPF/email ja tem um `perfil_atleta` no Carreira
4. Automaticamente (ou via aprovacao do responsavel), vincula o `perfil_atleta.crianca_id` ao `crianca.id` da escola
5. Os dados institucionais (gols, jornada, premiacoes) passam a popular o perfil do Carreira
6. Os toggles de "Dados visiveis" sao habilitados automaticamente

**Nota**: Este fluxo e complexo e envolve logica de matching (CPF/email), aprovacao e migracao de dados. Recomendo implementar em uma fase posterior, apos estabilizar os 3 pontos acima. Posso detalhar esta integracao quando quiser avancar.

---

### Resumo de arquivos

| Arquivo | Alteracao |
|---|---|
| `src/hooks/useCarreiraData.ts` | Optimistic update no `usePostLike` + cache-buster no upload |
| `src/components/carreira/PerfilHeader.tsx` | Update otimista do avatar apos upload |
| `src/components/carreira/ProfilePhotoUpload.tsx` | Cache-buster na URL do banner |
| `src/components/carreira/EditPerfilDialog.tsx` | Toggles desabilitados para Carreira-only + verificacao de vinculo |

