import React, { useRef, useState } from 'react';
import { Upload as UploadIcon, File, CheckCircle2, Loader2 } from 'lucide-react';

const UploadPanel = ({ onUpload }) => {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setError(null);
            setFile(e.dataTransfer.files[0]);
        }
    };

    const pickFile = () => inputRef.current?.click();

    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f) {
            setError(null);
            setFile(f);
        }
    };

    const handleUpload = async () => {
        if (!file || !onUpload) return;
        if (!file.name.toLowerCase().endsWith('.csv')) {
            setError('Please upload a .csv file (backend currently supports CSV only).');
            return;
        }
        setIsUploading(true);
        setError(null);
        try {
            await onUpload(file);
            setFile(null);
        } catch (e) {
            setError(e?.message ?? 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {error && (
                <div className="text-xs text-risk-high bg-risk-high/10 border border-risk-high/20 px-3 py-2 rounded-lg">
                    {error}
                </div>
            )}
            <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={pickFile}
                role="button"
                tabIndex={0}
                className={`relative cursor-pointer border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all duration-200 ${isDragging
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border-muted bg-transparent'
                    } ${file ? 'border-risk-low/50 bg-risk-low/5' : ''}`}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                />
                {!file ? (
                    <>
                        <div className="w-12 h-12 bg-border/50 rounded-full flex items-center justify-center mb-3">
                            <UploadIcon className="w-6 h-6 text-text-muted" />
                        </div>
                        <p className="text-sm font-medium text-text-secondary">Drag & drop project file</p>
                        <p className="text-xs text-text-muted mt-1">.csv</p>
                    </>
                ) : (
                    <div className="flex flex-col items-center">
                        <CheckCircle2 className="w-10 h-10 text-risk-low mb-3" />
                        <p className="text-sm font-medium text-text-secondary truncate max-w-[200px]">{file.name}</p>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setFile(null);
                            }}
                            className="mt-3 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-risk-high transition-colors"
                        >
                            Remove
                        </button>
                    </div>
                )}
            </div>

            <button
                onClick={handleUpload}
                disabled={!file || isUploading || !onUpload}
                className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-white transition-all transform active:scale-[0.98]"
            >
                {isUploading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading…
                    </>
                ) : (
                    <>
                        <File className="w-4 h-4" />
                        Upload & Analyze
                    </>
                )}
            </button>
        </div>
    );
};

export default UploadPanel;
