import { describe, it, expect } from 'vitest';
import { TAB_COLORS, PHASE_TAB_CONFIG, ACTIVE_TAB_BG, ACTIVE_TAB_FG, INACTIVE_TAB_FG } from '../../.tai/hooks/lib/tab-constants';

describe('tab-constants', () => {
  it('TAB_COLORS has all required states', () => {
    expect(TAB_COLORS.thinking).toBeDefined();
    expect(TAB_COLORS.working).toBeDefined();
    expect(TAB_COLORS.question).toBeDefined();
    expect(TAB_COLORS.completed).toBeDefined();
    expect(TAB_COLORS.error).toBeDefined();
    expect(TAB_COLORS.idle).toBeDefined();
  });

  it('each TAB_COLOR has inactiveBg and label', () => {
    for (const [key, value] of Object.entries(TAB_COLORS)) {
      expect(value).toHaveProperty('inactiveBg');
      expect(value).toHaveProperty('label');
    }
  });

  it('PHASE_TAB_CONFIG has all algorithm phases', () => {
    const phases = ['OBSERVE', 'THINK', 'PLAN', 'BUILD', 'EXECUTE', 'VERIFY', 'LEARN', 'COMPLETE', 'IDLE'];
    for (const phase of phases) {
      expect(PHASE_TAB_CONFIG[phase]).toBeDefined();
      expect(PHASE_TAB_CONFIG[phase].symbol).toBeDefined();
      expect(PHASE_TAB_CONFIG[phase].inactiveBg).toBeDefined();
      expect(PHASE_TAB_CONFIG[phase].label).toBeDefined();
      expect(PHASE_TAB_CONFIG[phase].gerund).toBeDefined();
    }
  });

  it('ACTIVE_TAB_BG/FG and INACTIVE_TAB_FG are hex strings', () => {
    expect(ACTIVE_TAB_BG).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ACTIVE_TAB_FG).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(INACTIVE_TAB_FG).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
