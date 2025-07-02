import * as pdfjsLib from 'pdfjs-dist'

// Set up PDF.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
}

export interface TextMatch {
  keyword: string
  unNumber: string
  properShippingName: string
  hazardClass: string
  pageNumber: number
  context: string
  matchIndex: number
}

export interface ManifestAnalysisResult {
  matches: TextMatch[]
  totalPages: number
  extractedText: string
  processingTime: number
}

/**
 * Extract text content from a PDF file
 */
export async function extractTextFromPdf(file: File): Promise<{ text: string; totalPages: number }> {
  try {
    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Load the PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    const totalPages = pdf.numPages
    let fullText = ''
    
    // Extract text from each page
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      // Concatenate text items from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      
      fullText += `\n--- PAGE ${pageNum} ---\n${pageText}\n`
    }
    
    return { text: fullText, totalPages }
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw new Error('Failed to extract text from PDF file')
  }
}

/**
 * Search for dangerous goods keywords in extracted text
 */
export function searchForDangerousGoods(
  text: string,
  dangerousGoods: Array<{
    un_number: string
    proper_shipping_name: string
    hazard_class: string
    simplified_name?: string
  }>
): TextMatch[] {
  const matches: TextMatch[] = []
  const lines = text.split('\n')
  
  // Create a comprehensive list of keywords to search for
  const keywords: Array<{
    keyword: string
    unNumber: string
    properShippingName: string
    hazardClass: string
  }> = []
  
  dangerousGoods.forEach(dg => {
    // Add UN number as a keyword
    keywords.push({
      keyword: dg.un_number,
      unNumber: dg.un_number,
      properShippingName: dg.proper_shipping_name,
      hazardClass: dg.hazard_class
    })
    
    // Add proper shipping name as keywords (split by common separators)
    const nameKeywords = dg.proper_shipping_name
      .split(/[,;()]/)
      .map(k => k.trim())
      .filter(k => k.length > 2) // Only meaningful keywords
    
    nameKeywords.forEach(keyword => {
      keywords.push({
        keyword,
        unNumber: dg.un_number,
        properShippingName: dg.proper_shipping_name,
        hazardClass: dg.hazard_class
      })
    })
    
    // Add simplified name if available
    if (dg.simplified_name) {
      const simplifiedKeywords = dg.simplified_name
        .split(/[,;()]/)
        .map(k => k.trim())
        .filter(k => k.length > 2)
      
      simplifiedKeywords.forEach(keyword => {
        keywords.push({
          keyword,
          unNumber: dg.un_number,
          properShippingName: dg.proper_shipping_name,
          hazardClass: dg.hazard_class
        })
      })
    }
  })
  
  // Search for matches in the text
  lines.forEach((line, lineIndex) => {
    const pageNumber = Math.floor(lineIndex / 50) + 1 // Rough page estimation
    
    keywords.forEach(({ keyword, unNumber, properShippingName, hazardClass }) => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      let match
      
      while ((match = regex.exec(line)) !== null) {
        // Get context around the match
        const start = Math.max(0, match.index - 50)
        const end = Math.min(line.length, match.index + keyword.length + 50)
        const context = line.substring(start, end)
        
        matches.push({
          keyword: match[0],
          unNumber,
          properShippingName,
          hazardClass,
          pageNumber,
          context: context.trim(),
          matchIndex: match.index
        })
      }
    })
  })
  
  // Remove duplicates and sort by page number
  const uniqueMatches = matches.filter((match, index, self) => 
    index === self.findIndex(m => 
      m.keyword === match.keyword && 
      m.unNumber === match.unNumber && 
      m.pageNumber === match.pageNumber &&
      Math.abs(m.matchIndex - match.matchIndex) < 10 // Within 10 characters
    )
  )
  
  return uniqueMatches.sort((a, b) => a.pageNumber - b.pageNumber)
}

/**
 * Analyze a manifest PDF for dangerous goods
 */
export async function analyzeManifest(
  file: File,
  dangerousGoods: Array<{
    un_number: string
    proper_shipping_name: string
    hazard_class: string
    simplified_name?: string
  }>
): Promise<ManifestAnalysisResult> {
  const startTime = performance.now()
  
  // Extract text from PDF
  const { text, totalPages } = await extractTextFromPdf(file)
  
  // Search for dangerous goods
  const matches = searchForDangerousGoods(text, dangerousGoods)
  
  const processingTime = performance.now() - startTime
  
  return {
    matches,
    totalPages,
    extractedText: text,
    processingTime
  }
}

/**
 * Get text content for a specific page (for highlighting)
 */
export async function getPageTextContent(file: File, pageNumber: number): Promise<any[]> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise
    
    if (pageNumber < 1 || pageNumber > pdf.numPages) {
      throw new Error(`Invalid page number: ${pageNumber}`)
    }
    
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    
    return textContent.items
  } catch (error) {
    console.error('Error getting page text content:', error)
    throw new Error(`Failed to get text content for page ${pageNumber}`)
  }
} 