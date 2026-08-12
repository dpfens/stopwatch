import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { StructuredDataService } from '../../../services/utility/browser/schema.service';
import { CommonModule } from '@angular/common';
import { VERSION } from '../../../version';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface FaqItem {
  category: string;
  question: string;
  answer: string;
  cssClass?: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [MatCardModule, MatExpansionModule, MatIconModule, CommonModule],
  templateUrl: './about.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './about.component.scss'
})
export class AboutComponent {
  structuredData = inject(StructuredDataService);
  sanitizer = inject(DomSanitizer);
  repositoryURL = VERSION.repository;
  faqs: FaqItem[] = [
    {
      category: 'Account',
      question: 'Why do I not need an account?',
      answer: 'All your information is stored locally on your device, so there\'s no need for an account or a server.'
    },
    {
      category: 'Accuracy',
      question: 'How accurate is the timing?',
      answer: 'Uses the same Web API that powers most online stopwatches. Accurate to milliseconds. In practical testing, it seems to match dedicated timing devices within 0.01 seconds.',
      cssClass: 'primary'
    },
    {
      category: 'Compatibility',
      question: 'Will this work on my device?',
      answer: 'Works on any modern browser (Chrome, Safari, Firefox, Edge). Tested on iPhones, Android phones, iPads, and laptops. If your browser was released in the last 3 years, you\'re good.',
      cssClass: 'secondary'
    },
    {
      category: 'Reliability',
      question: 'What happens if I accidentally close the browser?',
      answer: 'Your timers keep running. Everything is saved automatically. Open it back up and they\'ll be there.',
      cssClass: 'tertiary'
    },
    {
      category: 'Cost',
      question: 'Why is this free?',
      answer: 'Because I built it for myself and figured other people might find it useful. And I don\'t want to turn a side project that costs me nothing into a job.',
      cssClass: 'error'
    },
    {
      category: 'Use Cases',
      question: 'Is this a replacement for meet management software like MileSplit or chip timing?',
      answer: 'No. This is for coaches and athletes who need to time things accurately and keep that data organized while on a budget. If you\'re running a fully officiated meet, you need dedicated infrastructure. If you\'re timing your team at practice or watching splits from the infield, this is built for that.',
      cssClass: 'primary'
    },
    {
      category: 'Group Timing',
      question: 'Explain the group timing modes.',
      answer: 'Timing modes control how the stopwatches in a group coordinate with each other. ' +
        '<ul>' +
        '<li>Parallel: all timers run independently but share bulk controls (start, stop, reset, lap, and split).</li> ' +
        '<li>Synchronized: like parallel, but timers are started and stopped together.</li> ' +
        '<li>Sequential: one timer runs at a time. Hitting "Next" stops the current leg and starts the next one automatically, which is how relay handoffs actually work.</li> ' +
        '<li>Independent: timers share a group for organization only, with no coordination between them.</li> ' +
        '</ul>' +
        'Most tools give you independent timers and call it done. The distinction matters when your timing context has structure; a relay has a sequence, and a heat has a shared start.'
    },
    {
      category: 'Analytics',
      question: 'What does the stopwatch analytics actually show?',
      answer: 'Right now: split/lap predictions of a single same timer based on it\'s data. The data structure is built to support more over time, and I\'d rather show you what it does than promise what it might.',
      cssClass: 'tertiary'
    },
    {
      category: 'Features',
      question: 'What about [some niche feature]?',
      answer: 'Maybe! Send me your use case on GitHub. I\'m more interested in solving real problems than adding features nobody uses.',
      cssClass: 'secondary'
    },
    {
      category: 'Offline',
      question: 'Does it work offline/with no cell service?',
      answer: 'Yes. Everything runs locally. You could time at the bottom of a canyon with zero service and it works perfectly.',
      cssClass: 'surface'
    }
  ];

  ngOnInit(): void {
    this.addFaqStructuredData();
    this.addAboutPageStructuredData();
  }

  ngOnDestroy(): void {
    this.structuredData.clear();
  }

  private addFaqStructuredData(): void {
    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': this.faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    };

    this.structuredData.add('faqs', faqSchema);
  }

  private addAboutPageStructuredData(): void {
    const aboutPageSchema = {
        '@context': 'https://schema.org',
        '@type': 'AboutPage',
        'name': `About ${VERSION.displayName}`,
        'description': `Learn about the origin, technical details, and philosophy behind the ${VERSION.displayName} application: a free, offline, multi-stopwatch timing tool.`,
        'mainEntity': {
          '@type': 'WebApplication',
          '@id': VERSION.homepage, // Reference to the main app
          "name": VERSION.displayName,
          "applicationCategory": "ProductivityApplication",
          "operatingSystem": "All"
        }
    };
    this.structuredData.add('about-page-schema', aboutPageSchema); 
  }

  sanitize(text: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(text);
  }
}
