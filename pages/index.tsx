
'use client';

import { useState, useRef } from 'react';
import { createWorker } from 'tesseract.js';

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState('eng');
  const [binarization, setBinarization] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const languages = [
    { value: 'eng', label: 'English' },
    { value: 'chi_sim', label: 'Chinese (Simplified)' },
    { value: 'jpn', label: 'Japanese' },
    { value: 'kor', label: 'Korean' },
    { value: 'fra', label: 'French' },
    { value: 'deu', label: 'German' },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const preprocessImage = (imageSrc: string, { binarize }: { binarize: boolean }): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject('Could not get canvas context');
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        if (binarize) {
          const threshold = 128;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            const value = gray > threshold ? 255 : 0;
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
          }
        } else {
          const contrast = 1.5; // (1.0 = no change)
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            data[i] = gray * contrast + (128 * (1 - contrast));
            data[i + 1] = gray * contrast + (128 * (1 - contrast));
            data[i + 2] = gray * contrast + (128 * (1 - contrast));
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = (err) => {
        reject(err);
      };
    });
  };

  const handleRecognize = async () => {
    if (!image) return;
    setLoading(true);
    setText(null);
    setError(null);
    let worker;
    try {
      const processedImageSrc = await preprocessImage(image, { binarize: binarization });
      
      worker = await createWorker(language);
      const { data } = await worker.recognize(processedImageSrc);
      setText(data.text);
    } catch (err) {
      console.error(err);
      setError('An error occurred during text recognition.');
    } finally {
      await worker?.terminate();
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 md:p-8 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="w-full max-w-4xl p-6 sm:p-8 md:p-10 space-y-8 bg-white/10 rounded-2xl shadow-lg backdrop-blur-sm">
        <h1 className="text-4xl sm:text-5xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">AI-Powered OCR</h1>
        <p className="text-center text-gray-300 text-lg sm:text-xl">Instantly extract text from your images</p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div 
            className="flex items-center justify-center w-full sm:w-1/2 h-64 sm:h-80 border-2 border-dashed border-gray-400/50 rounded-xl cursor-pointer hover:bg-white/5 transition-all duration-300"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
              accept="image/*"
            />
            {image ? (
              <img src={image} alt="Preview" className="object-contain h-full rounded-lg" />
            ) : (
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-2 text-gray-400">Click to upload a file</p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            )}
          </div>

          <div className="w-full sm:w-1/2">
            <div className="flex flex-col space-y-4">
              <div>
                <label htmlFor="language" className="block mb-2 text-sm font-medium text-gray-300">Select Language</label>
                <select 
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-gray-700/50 border border-gray-600 text-white text-sm rounded-lg focus:ring-purple-500 focus:border-purple-500 block w-full p-2.5"
                >
                  {languages.map(lang => (
                    <option key={lang.value} value={lang.value}>{lang.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-300">Advanced Options</label>
                <div className="flex items-center">
                  <input
                    id="binarization"
                    type="checkbox"
                    checked={binarization}
                    onChange={(e) => setBinarization(e.target.checked)}
                    className="w-4 h-4 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-600 ring-offset-gray-800 focus:ring-2"
                  />
                  <label htmlFor="binarization" className="ml-2 text-sm font-medium text-gray-300">Binarization</label>
                </div>
              </div>

              <button
                onClick={handleRecognize}
                disabled={!image || loading}
                className="w-full px-6 py-3 text-lg font-semibold text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:bg-purple-400/50 focus:outline-none focus:ring-4 focus:ring-purple-300/50 transition-all duration-300 transform hover:scale-105 disabled:transform-none"
              >
                {loading ? 'Analyzing...' : 'Extract Text'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 mt-4 bg-red-500/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {text && (
          <div className="p-4 sm:p-6 mt-6 bg-white/5 rounded-xl shadow-inner">
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-200">Extracted Text:</h2>
            <p className="mt-4 text-gray-300 whitespace-pre-wrap text-base sm:text-lg">{text}</p>
          </div>
        )}
      </div>
    </div>
  );
}
