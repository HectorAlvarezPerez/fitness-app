import React from 'react';
import { useStore } from '../store/useStore';
import { Input } from '../components/ui/input';
import { NativeSelect } from '../components/ui/native-select';

const ProfileData: React.FC = () => {
  const { onboardingData, updateOnboardingData, userData } = useStore();

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mobile-page max-w-3xl space-y-4">
        <section className="mobile-card p-5 text-center">
          <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userData?.email || 'User'}`}
            alt="Profile Avatar"
            className="mx-auto size-24 rounded-full border-2 border-[#2f8cff]"
          />
          <h2 className="mt-4 text-3xl font-bold text-slate-900">
            {userData?.user_metadata?.full_name || userData?.email?.split('@')[0] || 'Usuario'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{userData?.email || 'Modo Invitado'}</p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="mobile-card p-4 text-center">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
              Nivel
            </p>
            <p className="mt-3 text-2xl font-bold text-[#4ea0ff]">{onboardingData.level || '-'}</p>
          </div>
          <div className="mobile-card p-4 text-center">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-500">
              Objetivo
            </p>
            <p className="mt-3 text-2xl font-bold text-[#4ea0ff]">
              {onboardingData.mainGoal || '-'}
            </p>
          </div>
        </section>

        <section className="mobile-card p-5">
          <p className="mobile-kicker">Perfil</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900">Datos personales</h3>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-600">Nivel de experiencia</span>
              <NativeSelect
                containerClassName="w-full"
                value={onboardingData.level || ''}
                onChange={(e) => updateOnboardingData({ level: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2f8cff]"
              >
                <option value="Principiante">Principiante</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Avanzado">Avanzado</option>
              </NativeSelect>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-600">Objetivo principal</span>
              <NativeSelect
                containerClassName="w-full"
                value={onboardingData.mainGoal || ''}
                onChange={(e) => updateOnboardingData({ mainGoal: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#2f8cff]"
              >
                <option value="Perder Peso">Perder Peso</option>
                <option value="Fuerza">Ganar Fuerza</option>
                <option value="Músculo">Ganar Músculo</option>
                <option value="Resistencia">Resistencia</option>
              </NativeSelect>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-600">Peso (kg)</span>
              <Input
                type="number"
                value={onboardingData.weight || ''}
                onChange={(e) => updateOnboardingData({ weight: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#2f8cff]"
                placeholder="Ej. 75"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-600">Altura (cm)</span>
              <Input
                type="number"
                value={onboardingData.height || ''}
                onChange={(e) => updateOnboardingData({ height: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#2f8cff]"
                placeholder="Ej. 175"
              />
            </label>
          </div>
        </section>

        <div className="mobile-card-soft flex gap-3 p-4">
          <span className="material-symbols-outlined text-[#4ea0ff]">info</span>
          <p className="text-sm leading-6 text-slate-500">
            Mantener estos datos al día mejora el cálculo de estadísticas y tus sugerencias de peso
            por ejercicio.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileData;
