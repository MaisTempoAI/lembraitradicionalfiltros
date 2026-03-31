import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MessageSquare, Smartphone, Link2, QrCode, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WhatsAppSetupDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function WhatsAppSetupDialog({ open, onClose }: WhatsAppSetupDialogProps) {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const handleSim = async () => {
    setStep(2);
    setLoading(true);
    setQrError(null);
    setQrData(null);

    try {
      const { data, error } = await supabase.functions.invoke('quepasa-connect', {
        body: { userId: user?.id },
      });

      if (error) throw error;

      if (data?.qrcode) {
        setQrData(data.qrcode);
      } else {
        setQrError('QR Code não recebido. Tente novamente.');
      }
    } catch (err: any) {
      console.error('Erro ao conectar WhatsApp:', err);
      setQrError('Erro ao gerar QR Code. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleConectei = async () => {
    await refreshUser();
    toast.success('WhatsApp conectado com sucesso!');
    setStep(1);
    setQrData(null);
    onClose();
  };

  const handleNao = () => {
    setStep(1);
    setQrData(null);
    onClose();
  };

  const instructions = [
    { icon: Smartphone, text: 'Abra seu WhatsApp' },
    { icon: Link2, text: 'Clique em Dispositivos Conectados' },
    { icon: MessageSquare, text: 'Verifique se tem disponibilidade (apenas 4 conexões)' },
    { icon: QrCode, text: 'Clique em Conectar dispositivo e aponte ao QR Code abaixo' },
  ];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        {step === 1 ? (
          <>
            <DialogHeader className="items-center text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <MessageSquare className="h-7 w-7 text-primary" />
              </div>
              <DialogTitle className="text-xl">Conecte seu WhatsApp</DialogTitle>
              <DialogDescription className="text-base mt-2">
                É preciso conectar o seu WhatsApp para utilizar o sistema. Deseja fazer isso agora?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0 mt-4">
              <Button onClick={handleSim} size="lg" className="w-full">
                Sim, conectar agora
              </Button>
              <Button onClick={handleNao} variant="outline" size="lg" className="w-full">
                Agora não
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">Instruções de Conexão</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                Siga os passos abaixo para conectar seu WhatsApp
              </DialogDescription>
            </DialogHeader>

            <ol className="space-y-3 my-4">
              {instructions.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground pt-0.5">{item.text}</span>
                </li>
              ))}
            </ol>

            <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-6 min-h-[200px]">
              {loading && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm">Gerando QR Code...</span>
                </div>
              )}
              {qrError && (
                <div className="flex flex-col items-center gap-2 text-destructive">
                  <span className="text-sm text-center">{qrError}</span>
                  <Button variant="outline" size="sm" onClick={handleSim}>
                    Tentar novamente
                  </Button>
                </div>
              )}
              {qrData && (
                <img src={qrData} alt="QR Code WhatsApp" className="max-w-[200px] max-h-[200px] rounded" />
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button onClick={handleConectei} size="lg" className="w-full gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Conectei meu WhatsApp
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
