import { Lock, Globe } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Dialog } from "@/components/common/Dialog";
import { Alert } from "@/components/common/Alert";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  compilerUrl: string;
  compilerToken: string;
  onSave: (url: string, token: string) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  compilerUrl,
  compilerToken,
  onSave,
}: SettingsModalProps) {
  const [tempUrl, setTempUrl] = useState(compilerUrl);
  const [tempToken, setTempToken] = useState(compilerToken);
  const [errors, setErrors] = useState<{ url?: string; token?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTempUrl(compilerUrl);
    setTempToken(compilerToken);
    setErrors({});
  }, [isOpen, compilerUrl, compilerToken]);

  const validateForm = () => {
    const newErrors: { url?: string; token?: string } = {};

    if (!tempUrl.trim()) {
      newErrors.url = "Compiler URL is required";
    } else if (!isValidUrl(tempUrl)) {
      newErrors.url = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      onSave(tempUrl, tempToken);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Globe size={20} className="text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Compiler Settings</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Configure your LaTeX compilation server
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Compiler URL Field */}
          <div>
            <label className="text-sm font-semibold flex items-center gap-2 mb-2">
              <Globe size={16} className="text-primary" />
              Compiler URL
            </label>
            <Input
              type="url"
              value={tempUrl}
              onChange={(e) => {
                setTempUrl(e.target.value);
                if (errors.url) setErrors({ ...errors, url: undefined });
              }}
              placeholder="https://treefrog-renderer.onrender.com"
              error={errors.url}
            />
            <p className="text-xs text-muted-foreground mt-2">
              The URL of your LaTeX compilation server. Make sure it&apos;s accessible
              and running.
            </p>
          </div>

          {/* Compiler Token Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Lock size={16} className="text-primary" />
                Compiler Token
              </label>
              <span className="text-xs text-muted-foreground">
                Optional
              </span>
            </div>
            <Input
              type="password"
              value={tempToken}
              onChange={(e) => {
                setTempToken(e.target.value);
                if (errors.token) setErrors({ ...errors, token: undefined });
              }}
              placeholder="Enter authentication token (if required)"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Authentication token for the compiler. Leave blank if not required.
            </p>
          </div>

          {/* Info Box */}
          <Alert
            variant="info"
            message="These settings are stored locally on your device and are not shared with anyone."
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            loading={isSaving}
            className="flex-1"
          >
            Save Settings
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
