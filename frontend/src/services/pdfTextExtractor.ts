import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.js';
}

export interface TextPosition {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HighlightArea {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: 'green' | 'yellow' | 'orange';
  keyword?: string;
  id?: string;
}

export class PDFTextExtractor {
  /**
   * Extract text with positions from a PDF file
   */
  static async extractTextWithPositions(file: File | string): Promise<TextPosition[]> {
    const textPositions: TextPosition[] = [];
    
    try {
      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument(file);
      const pdf = await loadingTask.promise;
      
      // Process each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Extract text items with positions
        textContent.items.forEach((item: any) => {
          if (item.str && item.str.trim()) {
            const transform = pdfjsLib.Util.transform(
              viewport.transform,
              item.transform
            );
            
            textPositions.push({
              text: item.str,
              page: pageNum,
              x: transform[4],
              y: viewport.height - transform[5] - item.height, // Convert to top-down coordinates
              width: item.width,
              height: item.height,
            });
          }
        });
      }
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw error;
    }
    
    return textPositions;
  }

  /**
   * Find keyword positions in the extracted text
   */
  static findKeywordPositions(
    textPositions: TextPosition[],
    keywords: string[]
  ): Map<string, HighlightArea[]> {
    const keywordPositions = new Map<string, HighlightArea[]>();
    
    keywords.forEach(keyword => {
      const positions: HighlightArea[] = [];
      const lowerKeyword = keyword.toLowerCase();
      
      // Group text positions by page and line
      const pageGroups = this.groupTextByPageAndLine(textPositions);
      
      pageGroups.forEach((lines, page) => {
        lines.forEach(line => {
          const lineText = line.map(pos => pos.text).join(' ').toLowerCase();
          
          // Find all occurrences of the keyword in the line
          let searchIndex = 0;
          while (searchIndex < lineText.length) {
            const index = lineText.indexOf(lowerKeyword, searchIndex);
            if (index === -1) break;
            
            // Calculate the position of the keyword
            const keywordPosition = this.calculateKeywordPosition(
              line,
              index,
              keyword.length
            );
            
            if (keywordPosition) {
              positions.push({
                page,
                x: keywordPosition.x,
                y: keywordPosition.y,
                width: keywordPosition.width,
                height: keywordPosition.height,
                color: 'yellow',
                keyword,
                id: `${keyword}-${page}-${positions.length}`,
              });
            }
            
            searchIndex = index + 1;
          }
        });
      });
      
      if (positions.length > 0) {
        keywordPositions.set(keyword, positions);
      }
    });
    
    return keywordPositions;
  }

  /**
   * Group text positions by page and line
   */
  private static groupTextByPageAndLine(
    textPositions: TextPosition[]
  ): Map<number, TextPosition[][]> {
    const pageGroups = new Map<number, TextPosition[][]>();
    
    // Group by page
    const pageMap = new Map<number, TextPosition[]>();
    textPositions.forEach(pos => {
      if (!pageMap.has(pos.page)) {
        pageMap.set(pos.page, []);
      }
      pageMap.get(pos.page)!.push(pos);
    });
    
    // Group by line within each page
    pageMap.forEach((positions, page) => {
      // Sort by y position (top to bottom) then x position (left to right)
      positions.sort((a, b) => {
        if (Math.abs(a.y - b.y) < 2) { // Same line threshold
          return a.x - b.x;
        }
        return a.y - b.y;
      });
      
      // Group into lines
      const lines: TextPosition[][] = [];
      let currentLine: TextPosition[] = [];
      let lastY = -1;
      
      positions.forEach(pos => {
        if (lastY === -1 || Math.abs(pos.y - lastY) < 2) {
          currentLine.push(pos);
        } else {
          if (currentLine.length > 0) {
            lines.push(currentLine);
          }
          currentLine = [pos];
        }
        lastY = pos.y;
      });
      
      if (currentLine.length > 0) {
        lines.push(currentLine);
      }
      
      pageGroups.set(page, lines);
    });
    
    return pageGroups;
  }

  /**
   * Calculate the position of a keyword within a line of text
   */
  private static calculateKeywordPosition(
    line: TextPosition[],
    startIndex: number,
    keywordLength: number
  ): { x: number; y: number; width: number; height: number } | null {
    let currentIndex = 0;
    let startX = 0;
    let endX = 0;
    let y = 0;
    let height = 0;
    let foundStart = false;
    
    for (const pos of line) {
      const textLength = pos.text.length;
      
      if (!foundStart && currentIndex + textLength > startIndex) {
        // Keyword starts in this text position
        const charIndex = startIndex - currentIndex;
        const charWidth = pos.width / textLength;
        startX = pos.x + charIndex * charWidth;
        y = pos.y;
        height = pos.height;
        foundStart = true;
      }
      
      if (foundStart && currentIndex + textLength >= startIndex + keywordLength) {
        // Keyword ends in this text position
        const charIndex = startIndex + keywordLength - currentIndex;
        const charWidth = pos.width / textLength;
        endX = pos.x + charIndex * charWidth;
        
        return {
          x: startX,
          y,
          width: endX - startX,
          height,
        };
      }
      
      currentIndex += textLength + 1; // +1 for space between words
    }
    
    return null;
  }

  /**
   * Search for dangerous goods keywords and return highlight areas
   */
  static async searchDangerousGoods(
    file: File | string,
    dangerousGoodsKeywords: string[]
  ): Promise<HighlightArea[]> {
    const textPositions = await this.extractTextWithPositions(file);
    const keywordPositions = this.findKeywordPositions(textPositions, dangerousGoodsKeywords);
    
    const allHighlights: HighlightArea[] = [];
    keywordPositions.forEach((positions) => {
      allHighlights.push(...positions);
    });
    
    return allHighlights;
  }
}