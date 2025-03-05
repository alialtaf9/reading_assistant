/**
 * @description
 * Service for extracting and processing content from web pages.
 * Provides intelligent extraction of relevant content.
 */

interface PageMetadata {
  title: string;
  url: string;
  siteName?: string;
  description?: string;
}

interface ContentSection {
  heading?: string;
  content: string;
  importance: number; // 1-10 scale, higher is more important
}

export interface ExtractedContent {
  metadata: PageMetadata;
  mainContent: string;
  sections: ContentSection[];
  wordCount: number;
}

/**
 * ContentExtractor service handles intelligent extraction of content from web pages
 */
export class ContentExtractor {
  /**
   * Extract the main content from the current page
   * @returns Structured content from the page
   */
  public extractContent(): ExtractedContent {
    const metadata = this.extractMetadata();
    
    // Check if we're on Gmail and use specialized extraction
    if (window.location.hostname.includes('mail.google.com')) {
      const sections = this.extractGmailContent();
      const mainContent = this.combineContentSections(sections);
      const wordCount = this.countWords(mainContent);
      
      return {
        metadata,
        mainContent,
        sections,
        wordCount
      };
    }
    
    // Standard extraction for other sites
    const sections = this.extractContentSections();
    const mainContent = this.combineContentSections(sections);
    const wordCount = this.countWords(mainContent);

    return {
      metadata,
      mainContent,
      sections,
      wordCount
    };
  }

  /**
   * Extract content specifically from Gmail
   */
  private extractGmailContent(): ContentSection[] {
    const sections: ContentSection[] = [];
    
    try {
      // Get email subject
      const subjectElements = document.querySelectorAll('h2[data-thread-perm-id], [role="heading"][data-thread-id]');
      let subject = '';
      
      if (subjectElements.length > 0) {
        subject = subjectElements[0].textContent?.trim() || 'Email';
        sections.push({
          heading: 'Subject',
          content: subject,
          importance: 10
        });
      }

      // Try to get email content
      // Method 1: Look for the email body containers
      const emailBodyElements = document.querySelectorAll('[role="listitem"] [data-message-id] div[dir="ltr"], [role="listitem"] [data-message-id] div[dir="auto"]');
      
      if (emailBodyElements.length > 0) {
        emailBodyElements.forEach((element, index) => {
          const senderElement = element.closest('[data-message-id]')?.querySelector('[email]');
          const sender = senderElement?.textContent?.trim() || `Sender ${index + 1}`;
          
          sections.push({
            heading: `Email from ${sender}`,
            content: element.textContent?.trim() || '',
            importance: 9
          });
        });
      } else {
        // Method 2: Try an alternative selector for email content
        const alternativeEmailBodies = document.querySelectorAll('.a3s.aiL, [role="listitem"] [data-message-id] .ii.gt');
        
        if (alternativeEmailBodies.length > 0) {
          alternativeEmailBodies.forEach((element, index) => {
            const messageContainer = element.closest('[data-message-id]');
            const senderElement = messageContainer?.querySelector('[email], .gD');
            const sender = senderElement?.textContent?.trim() || `Sender ${index + 1}`;
            
            sections.push({
              heading: `Email from ${sender}`,
              content: element.textContent?.trim() || '',
              importance: 9
            });
          });
        } else {
          // Method 3: Get any visible email content we can find
          const visibleEmailContent = Array.from(document.querySelectorAll('[role="main"] [role="list"] [role="listitem"]'))
            .filter(el => {
              const htmlElement = el as HTMLElement;
              return htmlElement.offsetHeight > 0 && htmlElement.offsetWidth > 0 && el.textContent?.trim();
            });
          
          if (visibleEmailContent.length > 0) {
            visibleEmailContent.forEach((element, index) => {
              sections.push({
                heading: `Email Content ${index + 1}`,
                content: element.textContent?.trim() || '',
                importance: 8
              });
            });
          }
        }
      }
      
      // If we still don't have content, try to get it from any visible text in the main area
      if (sections.length <= 1) { // Only subject, no email body
        const mainElement = document.querySelector('[role="main"]');
        if (mainElement) {
          sections.push({
            heading: 'Email Content',
            content: mainElement.textContent?.trim() || '',
            importance: 7
          });
        }
      }
      
      // Get email list if in inbox view
      const emailListItems = document.querySelectorAll('tr[role="row"]');
      if (emailListItems.length > 5) { // Looks like an inbox
        let emailListContent = '';
        
        emailListItems.forEach((row, index) => {
          if (index < 20) { // Limit to 20 emails for brevity
            const sender = row.querySelector('.yW, .bA4')?.textContent?.trim() || '';
            const subject = row.querySelector('.y6')?.textContent?.trim() || '';
            const snippet = row.querySelector('.y2')?.textContent?.trim() || '';
            
            if (sender && subject) {
              emailListContent += `${index + 1}. From: ${sender} - Subject: ${subject}`;
              if (snippet) {
                emailListContent += ` - ${snippet}`;
              }
              emailListContent += '\n';
            }
          }
        });
        
        if (emailListContent) {
          sections.push({
            heading: 'Inbox Emails',
            content: emailListContent,
            importance: 6
          });
        }
      }
    } catch (error) {
      // Fallback: use simple method
      sections.push({
        content: document.body.innerText,
        importance: 5
      });
    }
    
    return sections;
  }

  /**
   * Extract metadata from the page
   */
  private extractMetadata(): PageMetadata {
    const title = document.title || '';
    const url = window.location.href;
    
    // Try to get site name from Open Graph tags
    const siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || 
                    document.querySelector('meta[name="application-name"]')?.getAttribute('content') || 
                    new URL(url).hostname;
    
    // Try to get description from meta tags
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                       document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    
    return {
      title,
      url,
      siteName: typeof siteName === 'string' ? siteName : undefined,
      description: description || undefined
    };
  }

  /**
   * Extract content sections from the page using heuristics
   */
  private extractContentSections(): ContentSection[] {
    const sections: ContentSection[] = [];
    const contentSelectors = [
      // Main content selectors (common across many websites)
      'article', 'main', '.main-content', '#content', '.article', '.post', '.entry-content', 
      // Fallbacks if no main content is found
      '.content', '#main', 'section'
    ];
    
    // First try to find main content containers
    let mainContentElements: Element[] = [];
    
    for (const selector of contentSelectors) {
      const elements = Array.from(document.querySelectorAll(selector));
      if (elements.length > 0) {
        mainContentElements = elements;
        break;
      }
    }
    
    // If we found main content containers, extract from them
    if (mainContentElements.length > 0) {
      mainContentElements.forEach(element => {
        this.processContentElement(element, sections);
      });
    } else {
      // Fallback: use the body but try to exclude navigation and footers
      const body = document.body;
      const excludeSelectors = [
        'nav', 'header', 'footer', '.nav', '.navigation', '.menu', '.footer', '.sidebar',
        '.comments', '.ad', '.advertisement', '.social', '.related', '#sidebar'
      ];
      
      // Create a document fragment to clone body content for processing
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = body.innerHTML;
      
      // Remove elements that are likely not main content
      excludeSelectors.forEach(selector => {
        const elements = tempDiv.querySelectorAll(selector);
        elements.forEach(el => {
          el.parentNode?.removeChild(el);
        });
      });
      
      this.processContentElement(tempDiv, sections);
    }
    
    // If we still don't have much content, fallback to using everything
    if (this.countWords(this.combineContentSections(sections)) < 100) {
      sections.push({
        content: document.body.innerText,
        importance: 5
      });
    }
    
    return sections;
  }
  
  /**
   * Process a DOM element to extract content sections
   */
  private processContentElement(element: Element, sections: ContentSection[]): void {
    // First process headings and their following content
    const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    if (headings.length > 0) {
      headings.forEach(heading => {
        // Get importance based on heading level (h1=10, h2=9, etc.)
        const headingLevel = parseInt(heading.tagName.substring(1));
        const importance = Math.max(11 - headingLevel, 5); // h1=10, h2=9, ..., h6=5
        
        // Get text content
        const headingText = heading.textContent?.trim() || '';
        
        // Find content that belongs to this heading (all elements until next heading)
        let contentText = '';
        let nextElement = heading.nextElementSibling;
        
        while (nextElement && !nextElement.tagName.match(/^H[1-6]$/i)) {
          if (nextElement.textContent && nextElement.textContent.trim() !== '') {
            contentText += nextElement.textContent.trim() + ' ';
          }
          nextElement = nextElement.nextElementSibling;
        }
        
        if (headingText || contentText) {
          sections.push({
            heading: headingText || undefined,
            content: contentText.trim(),
            importance
          });
        }
      });
    } else {
      // If no headings, just extract all text content
      const paragraphs = element.querySelectorAll('p');
      
      if (paragraphs.length > 0) {
        let contentText = '';
        paragraphs.forEach(p => {
          if (p.textContent && p.textContent.trim() !== '') {
            contentText += p.textContent.trim() + ' ';
          }
        });
        
        if (contentText) {
          sections.push({
            content: contentText.trim(),
            importance: 7 // Default importance for paragraph content
          });
        }
      } else {
        // Last resort: just get all text
        const content = element.textContent?.trim() || '';
        if (content) {
          sections.push({
            content,
            importance: 5 // Lower importance for unstructured content
          });
        }
      }
    }
    
    // Look for lists as they often contain important information
    const lists = element.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const listItems = list.querySelectorAll('li');
      let listText = '';
      
      listItems.forEach((item, index) => {
        const itemText = item.textContent?.trim() || '';
        if (itemText) {
          listText += `${index + 1}. ${itemText}\n`;
        }
      });
      
      if (listText) {
        sections.push({
          content: listText.trim(),
          importance: 6 // Medium-high importance for lists
        });
      }
    });
  }
  
  /**
   * Combine all sections into a single text, prioritizing by importance
   */
  private combineContentSections(sections: ContentSection[]): string {
    // Sort sections by importance (highest first)
    const sortedSections = [...sections].sort((a, b) => b.importance - a.importance);
    
    // Combine sections into a single text
    let result = '';
    sortedSections.forEach(section => {
      if (section.heading) {
        result += `## ${section.heading} ##\n\n`;
      }
      result += `${section.content}\n\n`;
    });
    
    // Clean up and return
    return result.trim();
  }

  /**
   * Format the extracted content for sending to ChatGPT
   */
  public formatContentForChatGPT(extractedContent: ExtractedContent): string {
    const { metadata, mainContent, wordCount } = extractedContent;
    
    let formattedContent = '';
    
    // Add metadata
    formattedContent += `PAGE INFORMATION:\n`;
    formattedContent += `Title: ${metadata.title}\n`;
    formattedContent += `URL: ${metadata.url}\n`;
    
    if (metadata.siteName) {
      formattedContent += `Site: ${metadata.siteName}\n`;
    }
    
    if (metadata.description) {
      formattedContent += `Description: ${metadata.description}\n`;
    }
    
    formattedContent += `\n`;
    
    // Add main content
    formattedContent += `PAGE CONTENT (${wordCount} words):\n\n`;
    formattedContent += mainContent;
    
    // If the content is too long, truncate it
    const maxContentLength = 8000; // Limit to 8000 characters
    if (formattedContent.length > maxContentLength) {
      formattedContent = formattedContent.substring(0, maxContentLength);
      formattedContent += `\n\n[Content truncated due to length. ${wordCount} total words on page]`;
    }
    
    return formattedContent;
  }

  /**
   * Count words in a string
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }
}

// Create and export a singleton instance
export const contentExtractor = new ContentExtractor(); 