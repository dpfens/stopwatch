import { Component, inject } from '@angular/core';
import { GroupService } from '../../../../services/group/group.service';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { CommonModule } from '@angular/common';
import { 
  StopwatchGroup, 
  ContextualStopwatchEntity, 
  GroupTimingBehavior,
  GroupEvaluationBehavior,
  StopwatchAnalyticsTrait
} from '../../../../models/sequence/interfaces';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { GroupListViewComponent } from "../../../shared/group/views/list/group-list/group-list.component";
import { StopwatchCollectionViewComponent } from "../../../shared/stopwatch/collection/stopwatch-collection.component";

interface PresetBreakdown {
  name: string;
  count: number;
  groups: StopwatchGroup[];
}

interface TimingBreakdown {
  behavior: GroupTimingBehavior;
  count: number;
  percentage: number;
}

interface EvaluationBreakdown {
  behavior: GroupEvaluationBehavior;
  count: number;
  percentage: number;
}

interface AnalyticsBreakdown {
  trait: StopwatchAnalyticsTrait;
  count: number;
  percentage: number;
}

interface SizeDistribution {
  label: string;
  range: string;
  count: number;
  percentage: number;
  min: number;
  max: number;
}

interface BehaviorMatrix {
  timing: GroupTimingBehavior;
  evaluation: GroupEvaluationBehavior;
  count: number;
}

interface ActivityPeriod {
  label: string;
  count: number;
  percentage: number;
  groups: StopwatchGroup[];
}

interface OverlappingStopwatch {
  stopwatch: ContextualStopwatchEntity;
  groups: StopwatchGroup[];
  groupCount: number;
}

interface ComplexityLevel {
  level: string;
  count: number;
  dots: number;
  description: string;
}

@Component({
  selector: 'group-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatSidenavModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    RouterLink,
    GroupListViewComponent,
    StopwatchCollectionViewComponent
],
  templateUrl: './group-overview.component.html',
  styleUrl: './group-overview.component.scss'
})
export class GroupOverviewComponent {
  private service = inject(GroupService);
  
  instances = this.service.instances;
  loading = this.service.isLoading;
  error = this.service.error;

  /**
   * Get breakdown of groups by preset type
   */
  getPresetBreakdown(): PresetBreakdown[] {
    const groups = this.instances();
    if (!groups) return [];

    const presetMap = new Map<string, StopwatchGroup[]>();

    groups.forEach(group => {
      const preset = this.inferPreset(group);
      if (!presetMap.has(preset)) {
        presetMap.set(preset, []);
      }
      presetMap.get(preset)!.push(group);
    });

    return Array.from(presetMap.entries()).map(([name, groups]) => ({
      name,
      count: groups.length,
      groups
    }));
  }

  truncate(str: string | number, maxLength: number) {
    if (typeof str === 'number') {
      str = str.toString();
    }
    if (str.length <= maxLength) {
      return str;
    } else {
      return str.slice(0, maxLength - 3) + "..."; 
    }
  }

  /**
   * Infer preset type from group traits
   */
  private inferPreset(group: StopwatchGroup): string {
    const timing = group.traits.timing;
    const evaluation = group.traits.evaluation;

    if (evaluation.includes('comparative') && 
        (timing === 'parallel' || timing === 'synchronized')) {
      return 'competition';
    }

    if (timing === 'sequential' && evaluation.includes('cumulative')) {
      return 'workflow';
    }

    if (evaluation.includes('threshold') && timing === 'independent') {
      return 'billing';
    }

    return 'normal';
  }

  /**
   * Get breakdown of timing behaviors
   */
  getTimingBreakdown(): TimingBreakdown[] {
    const groups = this.instances();
    if (!groups || groups.length === 0) return [];

    const timingMap = new Map<GroupTimingBehavior, number>();

    groups.forEach(group => {
      const current = timingMap.get(group.traits.timing) || 0;
      timingMap.set(group.traits.timing, current + 1);
    });

    const total = groups.length;

    return Array.from(timingMap.entries())
      .map(([behavior, count]) => ({
        behavior,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get breakdown of evaluation behaviors
   */
  getEvaluationBreakdown(): EvaluationBreakdown[] {
    const groups = this.instances();
    if (!groups || groups.length === 0) return [];

    const evaluationMap = new Map<GroupEvaluationBehavior, number>();

    groups.forEach(group => {
      group.traits.evaluation.forEach(behavior => {
        const current = evaluationMap.get(behavior) || 0;
        evaluationMap.set(behavior, current + 1);
      });
    });

    const total = groups.length;

    return Array.from(evaluationMap.entries())
      .map(([behavior, count]) => ({
        behavior,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get average evaluation count for determining primary behaviors
   */
  getEvaluationAverage(): number {
    const breakdown = this.getEvaluationBreakdown();
    if (breakdown.length === 0) return 0;
    const sum = breakdown.reduce((acc, item) => acc + item.count, 0);
    return sum / breakdown.length;
  }

  /**
   * Get breakdown of analytics traits
   */
  getAnalyticsBreakdown(): AnalyticsBreakdown[] {
    const groups = this.instances();
    if (!groups || groups.length === 0) return [];

    const analyticsMap = new Map<StopwatchAnalyticsTrait, number>();

    groups.forEach(group => {
      group.traits.analytics.forEach(config => {
        const current = analyticsMap.get(config.trait) || 0;
        analyticsMap.set(config.trait, current + 1);
      });
    });

    const total = groups.length;

    return Array.from(analyticsMap.entries())
      .map(([trait, count]) => ({
        trait,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Format analytics trait name for display
   */
  formatTraitName(trait: string): string {
    return trait.split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get distribution of group sizes
   */
  getSizeDistribution(): SizeDistribution[] {
    const groups = this.instances();
    if (!groups || groups.length === 0) return [];

    const buckets = [
      { label: 'Solo', range: '1', min: 1, max: 1 },
      { label: 'Small', range: '2-5', min: 2, max: 5 },
      { label: 'Medium', range: '6-10', min: 6, max: 10 },
      { label: 'Large', range: '11-20', min: 11, max: 20 },
      { label: 'Massive', range: '20+', min: 21, max: Infinity }
    ];

    const distribution = buckets.map(bucket => {
      const count = groups.filter(g => 
        g.members.length >= bucket.min && g.members.length <= bucket.max
      ).length;
      
      return {
        ...bucket,
        count,
        percentage: groups.length > 0 ? (count / groups.length) * 100 : 0
      };
    });

    return distribution.filter(d => d.count > 0);
  }

  /**
   * Get matrix of timing vs evaluation combinations
   */
  getBehaviorMatrix(): BehaviorMatrix[] {
    const groups = this.instances();
    if (!groups || groups.length === 0) return [];

    const matrix: BehaviorMatrix[] = [];
    const timingBehaviors: GroupTimingBehavior[] = ['parallel', 'sequential', 'independent', 'synchronized', 'overlapping'];
    const evaluationBehaviors: GroupEvaluationBehavior[] = ['independent', 'comparative', 'cumulative', 'threshold', 'proportional', 'trending'];

    timingBehaviors.forEach(timing => {
      evaluationBehaviors.forEach(evaluation => {
        const count = groups.filter(g => 
          g.traits.timing === timing && g.traits.evaluation.includes(evaluation)
        ).length;
        
        matrix.push({ timing, evaluation, count });
      });
    });

    return matrix.filter(m => m.count > 0).sort((a, b) => b.count - a.count);
  }

  /**
   * Get activity breakdown by time periods
   */
  getActivityBreakdown(): ActivityPeriod[] {
    const groups = this.instances();
    if (!groups || groups.length === 0) return [];

    const now = new Date();
    const periods = [
      { label: 'Today', days: 1 },
      { label: 'This Week', days: 7 },
      { label: 'This Month', days: 30 },
      { label: 'Older', days: Infinity }
    ];

    const distribution = periods.map(period => {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - period.days);

      const periodGroups = groups.filter(g => {
        const lastMod = g.metadata.lastModification.timestamp.toUTCDate();
        if (period.days === Infinity) {
          return lastMod < cutoff;
        }
        return lastMod >= cutoff;
      });

      return {
        label: period.label,
        count: periodGroups.length,
        percentage: (periodGroups.length / groups.length) * 100,
        groups: periodGroups
      };
    });

    return distribution.filter(d => d.count > 0);
  }

  /**
   * Get stopwatches that belong to multiple groups
   */
  getMultiGroupStopwatches(): ContextualStopwatchEntity[] {
    const groups = this.instances();
    if (!groups) return [];

    const stopwatchGroupCount = new Map<string, number>();

    groups.forEach(group => {
      group.members.forEach(member => {
        const current = stopwatchGroupCount.get(member.id) || 0;
        stopwatchGroupCount.set(member.id, current + 1);
      });
    });

    const allStopwatches = this.getAllUniqueStopwatches();
    
    return allStopwatches.filter(sw => 
      (stopwatchGroupCount.get(sw.id) || 0) > 1
    );
  }

  /**
   * Get average number of groups per stopwatch
   */
  getAverageGroupsPerStopwatch(): number {
    const groups = this.instances();
    if (!groups) return 0;

    const stopwatchGroupCount = new Map<string, number>();

    groups.forEach(group => {
      group.members.forEach(member => {
        const current = stopwatchGroupCount.get(member.id) || 0;
        stopwatchGroupCount.set(member.id, current + 1);
      });
    });

    if (stopwatchGroupCount.size === 0) return 0;

    const total = Array.from(stopwatchGroupCount.values()).reduce((a, b) => a + b, 0);
    return total / stopwatchGroupCount.size;
  }

  /**
   * Get maximum number of groups for any single stopwatch
   */
  getMaxOverlap(): number {
    const groups = this.instances();
    if (!groups) return 0;

    const stopwatchGroupCount = new Map<string, number>();

    groups.forEach(group => {
      group.members.forEach(member => {
        const current = stopwatchGroupCount.get(member.id) || 0;
        stopwatchGroupCount.set(member.id, current + 1);
      });
    });

    return Math.max(0, ...Array.from(stopwatchGroupCount.values()));
  }

  /**
   * Get top overlapping stopwatches
   */
  getTopOverlappingStopwatches(): OverlappingStopwatch[] {
    const groups = this.instances();
    if (!groups) return [];

    const stopwatchGroupsMap = new Map<string, StopwatchGroup[]>();

    groups.forEach(group => {
      group.members.forEach(member => {
        if (!stopwatchGroupsMap.has(member.id)) {
          stopwatchGroupsMap.set(member.id, []);
        }
        stopwatchGroupsMap.get(member.id)!.push(group);
      });
    });

    const allStopwatches = this.getAllUniqueStopwatches();
    
    const overlapping: OverlappingStopwatch[] = allStopwatches
      .map(sw => ({
        stopwatch: sw,
        groups: stopwatchGroupsMap.get(sw.id) || [],
        groupCount: (stopwatchGroupsMap.get(sw.id) || []).length
      }))
      .filter(item => item.groupCount > 1)
      .sort((a, b) => b.groupCount - a.groupCount);

    return overlapping.slice(0, 5);
  }

  /**
   * Get complexity breakdown of groups
   */
  getComplexityBreakdown(): ComplexityLevel[] {
    const groups = this.instances();
    if (!groups || groups.length === 0) return [];

    const complexityLevels = [
      { level: 'Simple', dots: 1, description: 'Basic configuration', min: 0, max: 2 },
      { level: 'Moderate', dots: 2, description: 'Multiple features', min: 3, max: 4 },
      { level: 'Complex', dots: 3, description: 'Advanced setup', min: 5, max: Infinity }
    ];

    return complexityLevels.map(level => {
      const count = groups.filter(g => {
        const score = this.calculateComplexityScore(g);
        return score >= level.min && score <= level.max;
      }).length;

      return {
        ...level,
        count
      };
    }).filter(l => l.count > 0);
  }

  /**
   * Calculate complexity score for a group
   */
  private calculateComplexityScore(group: StopwatchGroup): number {
    let score = 0;
    
    // Add points for number of evaluation behaviors
    score += group.traits.evaluation.length;
    
    // Add points for analytics configurations
    score += group.traits.analytics.length;
    
    // Add points for complex timing behaviors
    if (group.traits.timing === 'sequential' || group.traits.timing === 'overlapping') {
      score += 1;
    }
    
    return score;
  }

  /**
   * Get all unique stopwatches across all groups
   */
  private getAllUniqueStopwatches(): ContextualStopwatchEntity[] {
    const groups = this.instances();
    if (!groups) return [];

    const allStopwatches: ContextualStopwatchEntity[] = [];
    
    groups.forEach(group => {
      group.members.forEach(member => {
        allStopwatches.push(member);
      });
    });

    return Array.from(
      new Map(allStopwatches.map(sw => [sw.id, sw])).values()
    );
  }

  /**
   * Get total number of stopwatches across all groups
   */
  getTotalMembers(): number {
    const groups = this.instances();
    if (!groups) return 0;

    return groups.reduce((sum, group) => sum + group.members.length, 0);
  }

  /**
   * Get average member count
   */
  getAverageMemberCount(): number {
    const groups = this.instances();
    if (!groups || groups.length === 0) return 0;

    const total = this.getTotalMembers();
    return Math.round(total / groups.length);
  }

  /**
   * Get recent stopwatches (most recently modified across all groups)
   */
  getRecentStopwatches(): ContextualStopwatchEntity[] {
    const uniqueStopwatches = this.getAllUniqueStopwatches();

    const sorted = uniqueStopwatches.sort((a, b) => {
      const dateA = a.metadata.lastModification.timestamp.timestamp;
      const dateB = b.metadata.lastModification.timestamp.timestamp;
      return dateB - dateA;
    });

    return sorted.slice(0, 6);
  }

  async createNew(): Promise<void> {
    const instance = this.service.blank('', '');
    await this.service.create(instance);
  }
}