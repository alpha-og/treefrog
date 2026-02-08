import { useState } from "react";
import { Zap, ChevronDown } from "lucide-react";

interface BuildButtonProps {
  onBuild: () => void;
  engine: string;
  onEngineChange: (engine: string) => void;
  shell: boolean;
  onShellChange: (shell: boolean) => void;
}

export default function BuildButton({
  onBuild,
  engine,
  onEngineChange,
  shell,
  onShellChange,
}: BuildButtonProps) {
  const [showMenu, setShowMenu] = useState(false);

  const engines = ["pdflatex", "xelatex", "lualatex"];

  return (
    <div className="relative flex items-center">
      {/* Main Build Button */}
      <button
        className="btn btn-primary gap-2 shadow-md hover:shadow-lg transition-all rounded-r-none"
        onClick={onBuild}
        title="Build document"
      >
        <Zap size={16} />
        Build
      </button>

      {/* Dropdown Trigger */}
      <button
        className="btn btn-primary shadow-md hover:shadow-lg transition-all rounded-l-none border-l border-l-primary-content/20 px-2"
        onClick={() => setShowMenu(!showMenu)}
        title="Build settings"
      >
        <ChevronDown size={16} />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div className="absolute right-0 top-full mt-2 w-64 bg-base-100 border border-base-content/10 rounded-xl shadow-xl z-50">
            {/* Engine Selection */}
            <div className="p-4 border-b border-base-content/5">
              <h3 className="text-xs font-semibold text-base-content/70 mb-3 uppercase tracking-wide">
                LaTeX Engine
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {engines.map((eng) => (
                  <button
                    key={eng}
                    onClick={() => {
                      onEngineChange(eng);
                      setShowMenu(false);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      engine === eng
                        ? "bg-primary text-primary-content shadow-md"
                        : "bg-base-200 text-base-content/70 hover:bg-base-300"
                    }`}
                  >
                    {eng}
                  </button>
                ))}
              </div>
            </div>

            {/* Shell Escape Option */}
            <div className="p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shell}
                  onChange={(e) => {
                    onShellChange(e.target.checked);
                  }}
                  className="checkbox checkbox-sm checkbox-primary"
                />
                <span className="text-sm font-medium">Enable shell-escape</span>
              </label>
            </div>
          </div>

          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
        </>
      )}
    </div>
  );
}
