import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SkillDefinition } from '../../lib/gitagent/types';

interface SkillWorkbenchState {
  skills: SkillDefinition[];
  activeSkillId: string | null;
}

interface SkillWorkbenchContextType {
  state: SkillWorkbenchState;
  createSkill: () => string;
  updateSkill: (id: string, updates: Partial<SkillDefinition>) => void;
  deleteSkill: (id: string) => void;
  setActiveSkill: (id: string | null) => void;
}

const SkillWorkbenchContext = createContext<SkillWorkbenchContextType | undefined>(undefined);

const STORAGE_KEY = 'gitagent_skill_workbench';

const initialSkill: SkillDefinition = {
  id: '',
  name: 'new-skill',
  description: '',
  license: 'MIT',
  compatibility: '>=0.1.0',
  allowedTools: [],
  metadata: {
    author: '',
    version: '1.0.0',
    category: 'general'
  },
  instructions: '',
  references: [],
  examples: [],
  scripts: []
};

export function SkillWorkbenchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SkillWorkbenchState>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse skill workbench state', e);
      }
    }
    return {
      skills: [],
      activeSkillId: null
    };
  });

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const createSkill = () => {
    const id = crypto.randomUUID();
    const newSkill = { ...initialSkill, id };
    setState(prev => ({
      ...prev,
      skills: [...prev.skills, newSkill],
      activeSkillId: id
    }));
    return id;
  };

  const updateSkill = (id: string, updates: Partial<SkillDefinition>) => {
    setState(prev => ({
      ...prev,
      skills: prev.skills.map(s => s.id === id ? { ...s, ...updates } : s)
    }));
  };

  const deleteSkill = (id: string) => {
    setState(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s.id !== id),
      activeSkillId: prev.activeSkillId === id ? null : prev.activeSkillId
    }));
  };

  const setActiveSkill = (id: string | null) => {
    setState(prev => ({ ...prev, activeSkillId: id }));
  };

  return (
    <SkillWorkbenchContext.Provider value={{ state, createSkill, updateSkill, deleteSkill, setActiveSkill }}>
      {children}
    </SkillWorkbenchContext.Provider>
  );
}

export function useSkillWorkbench() {
  const context = useContext(SkillWorkbenchContext);
  if (!context) throw new Error('useSkillWorkbench must be used within SkillWorkbenchProvider');
  return context;
}
