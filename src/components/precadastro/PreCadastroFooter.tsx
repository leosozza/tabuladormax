import { Building2 } from 'lucide-react';

export const PreCadastroFooter = () => {
  return (
    <footer className="bg-slate-900 text-white py-8 mt-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-slate-300" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1">Max Fama</h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              A principal agência de talentos do Brasil. Conectamos marcas aos melhores atores, 
              modelos e influenciadores do país.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
