import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AtividadeImageGalleryProps {
  images: string[];
  className?: string;
}

const AtividadeImageGallery = ({ images, className = '' }: AtividadeImageGalleryProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const handlePrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1);
  };

  const handleNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1);
  };

  // Layout based on number of images
  const renderGalleryLayout = () => {
    if (images.length === 1) {
      return (
        <div 
          className="aspect-video rounded-lg overflow-hidden cursor-pointer bg-muted"
          onClick={() => setSelectedIndex(0)}
        >
          <img 
            src={images[0]} 
            alt="Atividade" 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      );
    }

    if (images.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          {images.map((url, index) => (
            <div 
              key={index}
              className="aspect-square cursor-pointer bg-muted"
              onClick={() => setSelectedIndex(index)}
            >
              <img 
                src={url} 
                alt={`Atividade ${index + 1}`} 
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      );
    }

    // 3 images: 1 large + 2 small (stacked)
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-1 rounded-lg overflow-hidden" style={{ height: '280px' }}>
        <div 
          className="row-span-2 cursor-pointer bg-muted h-full"
          onClick={() => setSelectedIndex(0)}
        >
          <img 
            src={images[0]} 
            alt="Atividade 1" 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div 
          className="cursor-pointer bg-muted h-full"
          onClick={() => setSelectedIndex(1)}
        >
          <img 
            src={images[1]} 
            alt="Atividade 2" 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
        <div 
          className="cursor-pointer bg-muted h-full"
          onClick={() => setSelectedIndex(2)}
        >
          <img 
            src={images[2]} 
            alt="Atividade 3" 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={className}>
        {renderGalleryLayout()}
      </div>

      {/* Lightbox Modal */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 z-10 text-white hover:bg-white/20"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 z-10 text-white hover:bg-white/20"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}

            {/* Image */}
            {selectedIndex !== null && (
              <img
                src={images[selectedIndex]}
                alt={`Foto ${selectedIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
              />
            )}

            {/* Image counter */}
            {images.length > 1 && selectedIndex !== null && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {selectedIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AtividadeImageGallery;
