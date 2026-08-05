import { GroupEvaluationBehavior, GroupTimingBehavior, GroupTraitPreset, GroupTraits, ObjectiveType, ProgressSemanticTag, QualitySemanticTag, SelectOptGroup, SelectOption, StopWatchEventType } from "../models/sequence/interfaces";

// ACTIONS
export enum GLOBAL {
  CREATE = 'global.create',
  DELETE = 'global.delete',
  SEARCH = 'global.search',
  SIDENAV_TOGGLE = 'global.sidenav'
}

export enum Time {
  ONE_MINUTE = 60000,
  ONE_SECOND = 1000,
  FIVE_SECONDS = 5000,
  ONE_HOUR = 60 * 60 * 1000,
  ZERO = 0
}

/**
 * Predefined objective type presets for common use cases
 */
export const ObjectivePresets: Record<ObjectiveType, unknown> = {
    'time-minimization': {
        analytics: []
    },
    'unit-accumulation': {
        analytics: []
    },
    'synchronicity': {
        analytics: []
    }
} as const;

export const SelectableSplitTypes: SelectOptGroup<StopWatchEventType>[] = [
  {
    display: 'User Controls',
    options: [
      {
        display: 'User Start',
        value: 'user_start'
      },
      {
        display: 'User Stop',
        value: 'user_stop'
      },
      {
        display: 'User Resume',
        value: 'user_resume'
      }
    ]
  },
  {
    display: 'Performance Monitoring',
    options: [
      {
        display: 'Split Time',
        value: 'split'
      },
      {
        display: 'Lap / Cyclic Event',
        value: 'lap'
      },
      {
        display: 'Interval Event',
        value: 'interval'
      },
    ]
  }
] as const;

export const SelectableSemanticSplitTagTypes: SelectOptGroup<QualitySemanticTag> = {
    display: 'Quality & Stability',
    options: [
      {
        display: 'Performance Drift',
        value: 'drift'
      },
      {
        display: 'System Equilibrium',
        value: 'equilibrium'
      },
      {
        display: 'Value Oscillation',
        value: 'oscillation'
      },
      {
        display: 'Data Variance',
        value: 'variance'
      },
      {
        display: 'Auto Compensation',
        value: 'compensation'
      },
      {
        display: 'Stability Check',
        value: 'stability'
      }
    ]
} as const;

export const SelectableSemanticSplitProgressTypes: SelectOptGroup<ProgressSemanticTag> = {
    display: 'Progress Tracking',
    options: [
      {
        display: 'Data Accumulation',
        value: 'accumulation'
      },
      {
        display: 'Value Convergence',
        value: 'convergence'
      },
      {
        display: 'State Transition',
        value: 'state-transition'
      },
      {
        display: 'Saturation Point',
        value: 'saturation'
      },
      {
        display: 'Milestone Reached',
        value: 'milestone'
      },
      {
        display: 'Acceleration Event',
        value: 'acceleration'
      },
      {
        display: 'Deceleration Event',
        value: 'deceleration'
      }
    ]
  } as const;


export const LapUnits: SelectOptGroup<string>[] = [
    {
      display: 'Distance',
      options: [
        {
          display: 'Meters',
          value: 'm'
        },
        {
          display: 'Kilometers',
          value: 'km'
        },
        {
          display: 'Miles',
          value: 'mi'
        },
        {
          display: 'Yards',
          value: 'yd'
        }
      ]
    }
] as const;


export const ThemeOptions: SelectOptGroup<string>[] = [
    {
      display: 'Standard',
      options: [
        {
          display: 'Light',
          value: 'light'
        },
        {
          display: 'Dark',
          value: 'dark'
        }
      ]
    }
] as const;


export const stopwatchViewOptions: SelectOptGroup<string>[] = [
    {
      display: 'Standard',
      options: [
        {
          display: 'Grid',
          value: 'grid'
        },
        {
          display: 'List',
          value: 'list'
        }
      ]
    }
] as const;

/** 
 * Group Traits
 */
// Updated interfaces to include descriptions


export interface PresetConfig extends GroupTraits {
  description: string;
  useCases: string[];
}

/**
 * Predefined group type presets for common use cases
 */
export const GroupPresets: Record<GroupTraitPreset, PresetConfig> = {
  normal: {
    timing: 'independent',
    evaluation: ['independent'],
    analytics: [],
    description: 'Standard configuration for general-purpose timing. Each stopwatch operates independently without any special evaluation criteria.',
    useCases: ['General time tracking', 'Personal productivity', 'Simple task timing', 'Basic time logging']
  },
  competition: {
    timing: 'parallel',
    evaluation: ['comparative'],
    analytics: [],
    description: 'Designed for competitive scenarios where multiple participants start simultaneously and performance is compared against each other.',
    useCases: ['Sports events', 'Racing', 'Performance contests', 'Speed competitions', 'Team challenges']
  },
  workflow: {
    timing: 'sequential',
    evaluation: ['threshold', 'cumulative'],
    analytics: [],
    description: 'Perfect for process workflows where tasks must be completed in order, with performance thresholds and cumulative time tracking.',
    useCases: ['Manufacturing processes', 'Assembly lines', 'Multi-step procedures', 'Quality control workflows', 'Project phases']
  },
  billing: {
    timing: 'independent',
    evaluation: ['cumulative', 'proportional'],
    analytics: [],
    description: 'Optimized for time-based billing scenarios with cumulative tracking and proportional calculations for accurate invoicing.',
    useCases: ['Client billing', 'Hourly services', 'Consulting work', 'Freelance projects', 'Service time tracking']
  }
} as const;

/** 
 * Group Traits with descriptions
 */
export const GroupPresetOptions: SelectOption<GroupTraitPreset>[] = [
  {
    value: 'normal',
    display: 'Normal',
    description: 'Standard timing for everyday use'
  },
  {
    value: 'competition',
    display: 'Competition',
    description: 'Competitive timing with performance comparison'
  },
  {
    value: 'workflow',
    display: 'Workflow',
    description: 'Sequential process timing with thresholds'
  },
  {
    value: 'billing',
    display: 'Billing',
    description: 'Time tracking optimized for billing and invoicing'
  },
] as const;

export const GroupTimingOptions: SelectOption<GroupTimingBehavior>[] = [
  {
    value: 'independent',
    display: 'Independent',
    description: 'Each timer operates separately without coordination. Start and stop times are not synchronized with other timers.'
  },
  {
    value: 'overlapping',
    display: 'Overlapping',
    description: 'Timers can run simultaneously with overlapping periods. Useful for tracking concurrent activities or multitasking scenarios.'
  },
  {
    value: 'parallel',
    display: 'Parallel',
    description: 'All timers start at the same time and run simultaneously. Perfect for competitions or synchronized activities.'
  },
  {
    value: 'sequential',
    display: 'Sequential',
    description: 'Timers run one after another in a specific order. The next timer starts when the previous one stops, ideal for workflows.'
  },
  {
    value: 'synchronized',
    display: 'Synchronized',
    description: 'All timers are coordinated and controlled together. Start, stop, and pause actions affect all timers simultaneously.'
  }
] as const;

export const GroupEvaluationBehaviorOptions: SelectOption<GroupEvaluationBehavior>[] = [
  {
    value: 'independent',
    display: 'Independent',
    description: 'Each timer is evaluated separately without comparison to others. Results are standalone metrics.'
  },
  {
    value: 'comparative',
    display: 'Comparative',
    description: 'Timers are compared against each other to determine rankings, winners, or relative performance metrics.'
  },
  {
    value: 'cumulative',
    display: 'Cumulative',
    description: 'All timer values are added together to create a total sum. Useful for calculating total work time or combined efforts.'
  },
  {
    value: 'threshold',
    display: 'Threshold',
    description: 'Timers are evaluated against predefined time limits or performance thresholds. Triggers alerts when limits are exceeded.'
  },
  {
    value: 'proportional',
    display: 'Proportional',
    description: 'Timer values are calculated as percentages or ratios relative to the total or to each other. Useful for billing and allocation.'
  },
  {
    value: 'trending',
    display: 'Trending',
    description: 'Analyzes timer patterns over time to identify trends, improvements, or degradations in performance.'
  }
] as const;

export const ONE_MINUTE = 60 * 1000;