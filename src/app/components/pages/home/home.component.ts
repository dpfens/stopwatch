// home.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { RouterLink } from '@angular/router';
import { StructuredDataService } from '../../../services/utility/browser/schema.service';
import { VERSION } from '../../../version';
import { Meta } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    RouterLink
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  meta = inject(Meta);
  structuredData = inject(StructuredDataService);
  version = VERSION.version;
  buildDate = VERSION.buildDate;

  
  multipleTimerFeatures = [
    'Run as many stopwatches as you need simultaneously',
    'Copy a running timer to start timing someone else mid-race',
    'Each timer keeps its own splits and history',
    'Name your timers so you know which is which',
    'Group related timers together for easy management'
  ];

  organizationFeatures = [
    'Name your timers with runner names, event types, or whatever makes sense for your situation',
    'Group related timers together by event, team, session, or any way that helps you stay organized',
    'Archive old sessions to keep current ones clean and focused',
    'Search through your timing history when you need to reference past data'
  ];

  timingFeatures = [
    'Record splits during races without stopping the main timer',
    'Add lap markers for track events to keep track of distance and pacing',
    'Note events and measurements as they happen',
    'Add timestamps for specific moments you want to remember',
    'Review timing patterns and trends from your sessions'
  ];

  groupManagementFeatures = [
    'Set up timing groups for different scenarios - parallel starts for races, sequential handoffs for relays, or independent timing for general use',
    'The app understands different timing contexts and provides relevant tools for each',
    'Bulk operations for starting, stopping, or managing multiple timers at once'
  ];

  realConditions = [
    {
      title: 'Works Offline',
      description: 'Your data lives on your device, not in the cloud. Whether there\'s no internet, or no cell service, it will continue to work just as it always does.',
      icon: 'cloud_off'
    },
    {
      title: 'Battery Conscious',
      description: 'Designed to not drain your phone during long meets or training sessions. The app has been used for 5+ hour events without noticeable battery impact beyond normal usage.',
      icon: 'battery_charging_full'
    },
    {
      title: 'Actually Reliable',
      description: 'Your timing data isn\'t tied to keeping a browser window open or staying in the app. The underlying timing mechanism ensures accuracy regardless of what else you do with your device.',
      icon: 'verified'
    },
    {
      title: 'Responsive Interface',
      description: 'Works on phones, tablets, laptops. Touch or mouse. Portrait or landscape. The interface adapts to your device and how you\'re using it.',
      icon: 'devices'
    },
    {
      title: 'Privacy by Design',
      description: 'No accounts required and no personal data collection. Everything happens on your device. Your timing data never leaves your browser. Only feature usage is tracked to see what features are used versus what is ignored, but that\'s all anonymous.',
      icon: 'security'
    }
  ];

  useCases = [
    {
      title: 'Track & Field and Cross Country',
      description: 'Coaches timing multiple runners, recording splits at different distances, tracking training progress over time.',
      icon: 'directions_run'
    },
    {
      title: 'Research and Data Collection',
      description: 'Precise timing for experiments, observations, or any situation where you need accurate time measurements for multiple subjects or processes.',
      icon: 'science'
    },
    {
      title: 'Work and Manufacturing',
      description: 'Teams tracking completion rates, process timing, quality control intervals, or any workplace timing needs.',
      icon: 'precision_manufacturing'
    },
    {
      title: 'General Multi-Timing',
      description: 'Anyone juggling multiple processes where precise timing matters - cooking multiple dishes, study sessions, project work, or any situation where you need more than one timer running.',
      icon: 'timer'
    }
  ];

  ngOnInit(): void {
    // Add WebApplication schema
    this.structuredData.add('webapp', {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": VERSION.displayName,
      "applicationCategory": "ProductivityApplication",
      "description": VERSION.description,
      "url": VERSION.homepage,
      "browserRequirements": "Requires JavaScript. Works with modern browsers: Chrome 129+, Firefox 136+, Safari 16.4+, Edge 129+",
      "operatingSystem": "All",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        ...this.multipleTimerFeatures,
        ...this.groupManagementFeatures,
        ...this.organizationFeatures
      ],
      "softwareVersion": VERSION.version,
      "author": {
        "@type": "Person",
        "name": "Doug Fenstermacher"
      },
      "datePublished": this.buildDate,
      "inLanguage": "en"
    });
    this.structuredData.add('website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': VERSION.homepage,
      'name': VERSION.displayName,
      'url': VERSION.homepage,
      'description': VERSION.description
    });
    this.structuredData.add('breadcrumb', {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [{
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": VERSION.homepage
      }]
    });

    if (VERSION.keywords) {
      this.meta.updateTag({ 
        name: 'keywords', 
        content: Array.isArray(VERSION.keywords) 
          ? VERSION.keywords.join(', ') 
          : VERSION.keywords
      });
    }
    if (VERSION.description) {
      this.meta.updateTag({ 
        name: 'description', 
        content: VERSION.description
      });
    }
  }

  ngOnDestroy(): void {
    this.structuredData.clear();
    this.meta.removeTag('keywords');
    this.meta.removeTag('description');
  }
}