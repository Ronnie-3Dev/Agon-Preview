import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Unit } from './measureMath';
import { loadUnit, persistUnit } from './store';

interface UnitCtx {
  unit: Unit;
  setUnit: (u: Unit) => void;
}

const Ctx = createContext<UnitCtx>({ unit: 'cm', setUnit: () => {} });

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnitState] = useState<Unit>('cm');

  useEffect(() => {
    loadUnit().then((u) => {
      if (u === 'cm' || u === 'm' || u === 'ft' || u === 'in') setUnitState(u);
    });
  }, []);

  const setUnit = (u: Unit) => {
    setUnitState(u);
    persistUnit(u);
  };

  return <Ctx.Provider value={{ unit, setUnit }}>{children}</Ctx.Provider>;
}

export function useUnits() {
  return useContext(Ctx);
}
