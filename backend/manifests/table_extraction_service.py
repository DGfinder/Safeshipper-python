# Advanced Table Extraction Service for Manifest Processing
# Leverages existing PyMuPDF infrastructure for structured data extraction

import logging
import re
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass
from pathlib import Path
import json

import fitz  # PyMuPDF - already in requirements
import numpy as np
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)

@dataclass
class TableCell:
    """Individual table cell with content and position"""
    content: str
    bbox: Tuple[float, float, float, float]  # (x0, y0, x1, y1)
    row: int
    column: int
    confidence: float
    cell_type: str  # 'header', 'data', 'total', 'empty'

@dataclass
class ExtractedTable:
    """Complete table with metadata"""
    cells: List[List[TableCell]]  # 2D array of cells
    headers: List[str]
    rows: List[Dict[str, str]]  # List of row dictionaries
    bbox: Tuple[float, float, float, float]
    page_number: int
    table_type: str  # 'manifest', 'dg_list', 'summary', 'unknown'
    confidence: float
    extraction_method: str

@dataclass
class DocumentTableResult:
    """Complete document table extraction result"""
    tables: List[ExtractedTable]
    total_tables: int
    processing_time: float
    extraction_methods: List[str]
    quality_score: float

class AdvancedTableExtractor:
    """
    Advanced table extraction service for manifest documents
    Uses multiple strategies for robust table detection and extraction
    """
    
    def __init__(self):
        self.cache_timeout = 1800  # 30 minutes
        
        # Table detection patterns
        self.manifest_headers = [
            # Common dangerous goods manifest headers
            ['un', 'proper shipping name', 'class', 'packing group', 'quantity'],
            ['un number', 'description', 'hazard class', 'pg', 'weight'],
            ['dangerous goods', 'class', 'quantity', 'weight', 'container'],
            ['item', 'un no', 'proper shipping name', 'class', 'group'],
            ['sn', 'un', 'substance', 'class', 'quantity', 'remarks']
        ]
        
        # Column patterns for different manifest types
        self.column_patterns = {
            'un_number': [r'\bUN\s*\d{4}\b', r'\b\d{4}\b'],
            'shipping_name': [r'[A-Z][A-Za-z\s,.-]{10,}'],
            'hazard_class': [r'\b\d+(?:\.\d+)?\b', r'\bclass\s+\d+'],
            'packing_group': [r'\bI{1,3}\b', r'\b[123]\b', r'\bPG\s*[I123]'],
            'quantity': [r'\d+(?:\.\d+)?\s*(?:kg|l|tonnes?|tons?|litres?)', r'\d+\s*x\s*\d+'],
            'weight': [r'\d+(?:\.\d+)?\s*(?:kg|tonnes?|tons?|lbs?)']
        }

    def extract_tables_from_pdf(
        self,
        pdf_file: str,
        page_numbers: Optional[List[int]] = None,
        use_cache: bool = True
    ) -> DocumentTableResult:
        """
        Extract all tables from PDF document
        
        Args:
            pdf_file: Path to PDF file
            page_numbers: Specific pages to process (None for all)
            use_cache: Whether to use caching
            
        Returns:
            DocumentTableResult with extracted tables and metadata
        """
        start_time = timezone.now()
        
        # Cache key
        cache_key = None
        if use_cache:
            cache_key = f"table_extract:{hash(pdf_file)}:{hash(str(page_numbers))}"
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info("Table extraction cache hit")
                return DocumentTableResult(**cached_result)

        try:
            # Open PDF
            doc = fitz.open(pdf_file)
            all_tables = []
            extraction_methods = set()
            
            # Process specified pages or all pages
            pages_to_process = page_numbers or range(doc.page_count)
            
            for page_num in pages_to_process:
                if page_num >= doc.page_count:
                    continue
                    
                page = doc[page_num]
                page_tables = self._extract_page_tables(page, page_num)
                all_tables.extend(page_tables)
                
                # Track extraction methods used
                for table in page_tables:
                    extraction_methods.add(table.extraction_method)
            
            doc.close()
            
            # Calculate quality metrics
            quality_score = self._calculate_quality_score(all_tables)
            processing_time = (timezone.now() - start_time).total_seconds()
            
            result = DocumentTableResult(
                tables=all_tables,
                total_tables=len(all_tables),
                processing_time=processing_time,
                extraction_methods=list(extraction_methods),
                quality_score=quality_score
            )
            
            # Cache result
            if use_cache and cache_key:
                cache.set(cache_key, {
                    'tables': [self._serialize_table(table) for table in result.tables],
                    'total_tables': result.total_tables,
                    'processing_time': result.processing_time,
                    'extraction_methods': result.extraction_methods,
                    'quality_score': result.quality_score
                }, self.cache_timeout)
            
            return result
            
        except Exception as e:
            logger.error(f"Table extraction failed: {e}")
            raise

    def _extract_page_tables(self, page: fitz.Page, page_num: int) -> List[ExtractedTable]:
        """Extract tables from a single page using multiple methods"""
        tables = []
        
        # Method 1: PyMuPDF built-in table detection
        try:
            pymupdf_tables = self._extract_with_pymupdf_tables(page, page_num)
            tables.extend(pymupdf_tables)
        except Exception as e:
            logger.warning(f"PyMuPDF table extraction failed on page {page_num}: {e}")
        
        # Method 2: Text analysis with geometric detection
        try:
            geometric_tables = self._extract_with_geometric_analysis(page, page_num)
            tables.extend(geometric_tables)
        except Exception as e:
            logger.warning(f"Geometric table extraction failed on page {page_num}: {e}")
        
        # Method 3: Pattern-based extraction for known manifest formats
        try:
            pattern_tables = self._extract_with_pattern_matching(page, page_num)
            tables.extend(pattern_tables)
        except Exception as e:
            logger.warning(f"Pattern-based extraction failed on page {page_num}: {e}")
        
        # Deduplicate and merge overlapping tables
        deduplicated_tables = self._deduplicate_tables(tables)
        
        return deduplicated_tables

    def _extract_with_pymupdf_tables(self, page: fitz.Page, page_num: int) -> List[ExtractedTable]:
        """Extract tables using PyMuPDF's built-in table detection"""
        tables = []
        
        try:
            # Find tables using PyMuPDF
            page_tables = page.find_tables()
            
            for i, table in enumerate(page_tables):
                # Extract table content
                table_data = table.extract()
                
                if not table_data or len(table_data) < 2:
                    continue
                
                # Convert to our format
                cells = []
                headers = []
                rows = []
                
                # Process headers (first row)
                if table_data:
                    headers = [cell.strip() if cell else "" for cell in table_data[0]]
                    
                    # Process data rows
                    for row_idx, row_data in enumerate(table_data[1:], 1):
                        cell_row = []
                        row_dict = {}
                        
                        for col_idx, cell_content in enumerate(row_data):
                            content = cell_content.strip() if cell_content else ""
                            
                            # Create cell
                            cell = TableCell(
                                content=content,
                                bbox=(0, 0, 0, 0),  # PyMuPDF doesn't provide cell positions
                                row=row_idx,
                                column=col_idx,
                                confidence=0.8,
                                cell_type='data' if content else 'empty'
                            )
                            cell_row.append(cell)
                            
                            # Add to row dictionary
                            if col_idx < len(headers) and headers[col_idx]:
                                row_dict[headers[col_idx]] = content
                        
                        cells.append(cell_row)
                        if any(cell.content for cell in cell_row):  # Only add non-empty rows
                            rows.append(row_dict)
                
                # Determine table type
                table_type = self._classify_table_type(headers, rows)
                
                # Calculate confidence
                confidence = self._calculate_table_confidence(headers, rows, 'pymupdf')
                
                extracted_table = ExtractedTable(
                    cells=cells,
                    headers=headers,
                    rows=rows,
                    bbox=table.bbox,
                    page_number=page_num,
                    table_type=table_type,
                    confidence=confidence,
                    extraction_method='pymupdf_builtin'
                )
                
                tables.append(extracted_table)
                
        except Exception as e:
            logger.error(f"PyMuPDF table extraction error: {e}")
            
        return tables

    def _extract_with_geometric_analysis(self, page: fitz.Page, page_num: int) -> List[ExtractedTable]:
        """Extract tables by analyzing text positions and geometric layout"""
        tables = []
        
        try:
            # Get all text blocks with positions
            blocks = page.get_text("dict")
            text_elements = []
            
            for block in blocks["blocks"]:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            text_elements.append({
                                'text': span['text'].strip(),
                                'bbox': span['bbox'],
                                'size': span['size'],
                                'flags': span['flags']
                            })
            
            # Group elements into potential table rows based on y-position
            rows_by_y = self._group_elements_by_rows(text_elements)
            
            # Identify table-like structures
            potential_tables = self._identify_table_structures(rows_by_y, page_num)
            
            tables.extend(potential_tables)
            
        except Exception as e:
            logger.error(f"Geometric analysis error: {e}")
            
        return tables

    def _extract_with_pattern_matching(self, page: fitz.Page, page_num: int) -> List[ExtractedTable]:
        """Extract tables using pattern matching for known manifest formats"""
        tables = []
        
        try:
            # Get page text
            page_text = page.get_text()
            
            # Look for manifest-specific patterns
            for header_pattern in self.manifest_headers:
                table = self._extract_pattern_based_table(page_text, header_pattern, page_num)
                if table:
                    tables.append(table)
            
        except Exception as e:
            logger.error(f"Pattern matching error: {e}")
            
        return tables

    def _group_elements_by_rows(self, text_elements: List[Dict]) -> List[List[Dict]]:
        """Group text elements into rows based on y-position"""
        if not text_elements:
            return []
        
        # Sort by y-position
        sorted_elements = sorted(text_elements, key=lambda x: x['bbox'][1])
        
        rows = []
        current_row = []
        current_y = sorted_elements[0]['bbox'][1]
        y_threshold = 5  # Pixels threshold for same row
        
        for element in sorted_elements:
            element_y = element['bbox'][1]
            
            if abs(element_y - current_y) <= y_threshold:
                current_row.append(element)
            else:
                if current_row:
                    # Sort row elements by x-position
                    current_row.sort(key=lambda x: x['bbox'][0])
                    rows.append(current_row)
                current_row = [element]
                current_y = element_y
        
        # Add last row
        if current_row:
            current_row.sort(key=lambda x: x['bbox'][0])
            rows.append(current_row)
        
        return rows

    def _identify_table_structures(self, rows_by_y: List[List[Dict]], page_num: int) -> List[ExtractedTable]:
        """Identify table structures from grouped text elements"""
        tables = []
        
        if len(rows_by_y) < 3:  # Need at least header + 2 data rows
            return tables
        
        # Look for consistent column structures
        for start_idx in range(len(rows_by_y) - 2):
            potential_table = self._analyze_table_candidate(rows_by_y[start_idx:], page_num, start_idx)
            if potential_table:
                tables.append(potential_table)
        
        return tables

    def _analyze_table_candidate(self, rows: List[List[Dict]], page_num: int, start_idx: int) -> Optional[ExtractedTable]:
        """Analyze a sequence of rows to determine if they form a table"""
        if len(rows) < 2:
            return None
        
        # Analyze column consistency
        column_positions = self._find_column_positions(rows[:min(5, len(rows))])
        
        if len(column_positions) < 2:  # Need at least 2 columns
            return None
        
        # Extract table data
        headers = []
        data_rows = []
        cells = []
        
        # First row as potential headers
        first_row = rows[0]
        for col_idx, pos in enumerate(column_positions):
            header_cell = self._find_cell_at_position(first_row, pos)
            headers.append(header_cell['text'] if header_cell else f"Column_{col_idx}")
        
        # Process data rows
        for row_idx, row_elements in enumerate(rows[1:], 1):
            if row_idx > 20:  # Limit table size
                break
                
            row_dict = {}
            cell_row = []
            
            for col_idx, pos in enumerate(column_positions):
                cell_element = self._find_cell_at_position(row_elements, pos)
                content = cell_element['text'] if cell_element else ""
                
                cell = TableCell(
                    content=content,
                    bbox=cell_element['bbox'] if cell_element else (0, 0, 0, 0),
                    row=row_idx,
                    column=col_idx,
                    confidence=0.7,
                    cell_type='data' if content else 'empty'
                )
                cell_row.append(cell)
                
                # Add to row dictionary
                if col_idx < len(headers):
                    row_dict[headers[col_idx]] = content
            
            cells.append(cell_row)
            if any(cell.content for cell in cell_row):
                data_rows.append(row_dict)
        
        if not data_rows:
            return None
        
        # Calculate table bounds
        all_bboxes = []
        for row in rows[:len(cells)+1]:  # Include header row
            for element in row:
                all_bboxes.append(element['bbox'])
        
        if all_bboxes:
            min_x = min(bbox[0] for bbox in all_bboxes)
            min_y = min(bbox[1] for bbox in all_bboxes)
            max_x = max(bbox[2] for bbox in all_bboxes)
            max_y = max(bbox[3] for bbox in all_bboxes)
            table_bbox = (min_x, min_y, max_x, max_y)
        else:
            table_bbox = (0, 0, 0, 0)
        
        # Classify table type and calculate confidence
        table_type = self._classify_table_type(headers, data_rows)
        confidence = self._calculate_table_confidence(headers, data_rows, 'geometric')
        
        return ExtractedTable(
            cells=cells,
            headers=headers,
            rows=data_rows,
            bbox=table_bbox,
            page_number=page_num,
            table_type=table_type,
            confidence=confidence,
            extraction_method='geometric_analysis'
        )

    def _find_column_positions(self, rows: List[List[Dict]]) -> List[float]:
        """Find consistent column positions across rows"""
        all_x_positions = []
        
        for row in rows:
            for element in row:
                all_x_positions.append(element['bbox'][0])  # Left edge
        
        if not all_x_positions:
            return []
        
        # Cluster x-positions to find column boundaries
        sorted_positions = sorted(set(all_x_positions))
        columns = [sorted_positions[0]]
        
        for pos in sorted_positions[1:]:
            if pos - columns[-1] > 20:  # Minimum column spacing
                columns.append(pos)
        
        return columns

    def _find_cell_at_position(self, row_elements: List[Dict], x_position: float) -> Optional[Dict]:
        """Find the text element closest to a given x-position"""
        if not row_elements:
            return None
        
        closest_element = min(
            row_elements,
            key=lambda elem: abs(elem['bbox'][0] - x_position)
        )
        
        # Only return if reasonably close (within 50 pixels)
        if abs(closest_element['bbox'][0] - x_position) <= 50:
            return closest_element
        
        return None

    def _extract_pattern_based_table(
        self,
        text: str,
        header_pattern: List[str],
        page_num: int
    ) -> Optional[ExtractedTable]:
        """Extract table using specific header pattern"""
        lines = text.split('\n')
        
        # Find header line
        header_line_idx = None
        for idx, line in enumerate(lines):
            line_lower = line.lower()
            if all(header.lower() in line_lower for header in header_pattern):
                header_line_idx = idx
                break
        
        if header_line_idx is None:
            return None
        
        # Extract headers from the line
        header_line = lines[header_line_idx]
        headers = [h.strip() for h in re.split(r'\s{2,}|\t', header_line) if h.strip()]
        
        # Extract data rows following the header
        rows = []
        for line in lines[header_line_idx + 1:]:
            if not line.strip():
                continue
                
            # Check if line looks like data (has numbers, proper formats, etc.)
            if self._looks_like_data_row(line):
                row_cells = [cell.strip() for cell in re.split(r'\s{2,}|\t', line) if cell.strip()]
                
                # Create row dictionary
                row_dict = {}
                for i, cell in enumerate(row_cells):
                    if i < len(headers):
                        row_dict[headers[i]] = cell
                
                if row_dict:
                    rows.append(row_dict)
            
            # Stop at empty lines or non-data patterns
            elif len(rows) > 0:
                break
        
        if not rows:
            return None
        
        # Create cells structure
        cells = []
        for row_idx, row_dict in enumerate(rows):
            cell_row = []
            for col_idx, header in enumerate(headers):
                content = row_dict.get(header, "")
                cell = TableCell(
                    content=content,
                    bbox=(0, 0, 0, 0),  # Pattern extraction doesn't provide positions
                    row=row_idx,
                    column=col_idx,
                    confidence=0.75,
                    cell_type='data' if content else 'empty'
                )
                cell_row.append(cell)
            cells.append(cell_row)
        
        table_type = self._classify_table_type(headers, rows)
        confidence = self._calculate_table_confidence(headers, rows, 'pattern')
        
        return ExtractedTable(
            cells=cells,
            headers=headers,
            rows=rows,
            bbox=(0, 0, 0, 0),
            page_number=page_num,
            table_type=table_type,
            confidence=confidence,
            extraction_method='pattern_matching'
        )

    def _looks_like_data_row(self, line: str) -> bool:
        """Check if a line looks like a data row"""
        # Must contain some numbers or known patterns
        has_numbers = bool(re.search(r'\d', line))
        has_un_number = bool(re.search(r'\bUN?\s*\d{4}|\b\d{4}\b', line))
        has_class = bool(re.search(r'\b\d+(?:\.\d+)?\b', line))
        
        return has_numbers and (has_un_number or has_class or len(line.split()) >= 3)

    def _classify_table_type(self, headers: List[str], rows: List[Dict]) -> str:
        """Classify the type of table based on headers and content"""
        header_text = ' '.join(headers).lower()
        
        # Dangerous goods manifest indicators
        dg_indicators = ['un', 'dangerous', 'hazard', 'class', 'packing', 'shipping name']
        if any(indicator in header_text for indicator in dg_indicators):
            return 'dg_manifest'
        
        # Summary table indicators
        summary_indicators = ['total', 'summary', 'count', 'weight']
        if any(indicator in header_text for indicator in summary_indicators):
            return 'summary'
        
        # General manifest
        manifest_indicators = ['item', 'quantity', 'weight', 'container']
        if any(indicator in header_text for indicator in manifest_indicators):
            return 'manifest'
        
        return 'unknown'

    def _calculate_table_confidence(
        self,
        headers: List[str],
        rows: List[Dict],
        method: str
    ) -> float:
        """Calculate confidence score for extracted table"""
        if not headers or not rows:
            return 0.0
        
        score = 0.5  # Base score
        
        # Header quality
        if len(headers) >= 3:
            score += 0.1
        if any('un' in h.lower() for h in headers):
            score += 0.2
        if any(keyword in ' '.join(headers).lower() for keyword in ['class', 'hazard', 'dangerous']):
            score += 0.2
        
        # Data quality
        non_empty_cells = sum(1 for row in rows for value in row.values() if value.strip())
        total_cells = len(rows) * len(headers)
        if total_cells > 0:
            fill_rate = non_empty_cells / total_cells
            score += fill_rate * 0.3
        
        # Method-specific adjustments
        method_multipliers = {
            'pymupdf': 1.0,
            'geometric': 0.9,
            'pattern': 0.8
        }
        score *= method_multipliers.get(method, 0.7)
        
        return min(1.0, score)

    def _deduplicate_tables(self, tables: List[ExtractedTable]) -> List[ExtractedTable]:
        """Remove duplicate tables and merge overlapping ones"""
        if len(tables) <= 1:
            return tables
        
        # Sort by confidence (highest first)
        sorted_tables = sorted(tables, key=lambda t: t.confidence, reverse=True)
        
        unique_tables = []
        for table in sorted_tables:
            is_duplicate = False
            
            for existing in unique_tables:
                # Check for overlap or similarity
                if self._tables_overlap(table, existing):
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_tables.append(table)
        
        return unique_tables

    def _tables_overlap(self, table1: ExtractedTable, table2: ExtractedTable) -> bool:
        """Check if two tables overlap significantly"""
        if table1.page_number != table2.page_number:
            return False
        
        # Compare headers
        headers1 = set(h.lower() for h in table1.headers)
        headers2 = set(h.lower() for h in table2.headers)
        
        if len(headers1.intersection(headers2)) / max(len(headers1), len(headers2), 1) > 0.7:
            return True
        
        # Compare content
        content1 = set()
        content2 = set()
        
        for row in table1.rows[:5]:  # Compare first 5 rows
            content1.update(v.lower() for v in row.values() if v)
        
        for row in table2.rows[:5]:
            content2.update(v.lower() for v in row.values() if v)
        
        if len(content1.intersection(content2)) / max(len(content1), len(content2), 1) > 0.5:
            return True
        
        return False

    def _calculate_quality_score(self, tables: List[ExtractedTable]) -> float:
        """Calculate overall quality score for all extracted tables"""
        if not tables:
            return 0.0
        
        # Average confidence
        avg_confidence = sum(table.confidence for table in tables) / len(tables)
        
        # Bonus for finding DG tables
        dg_tables = [t for t in tables if t.table_type == 'dg_manifest']
        dg_bonus = 0.2 if dg_tables else 0.0
        
        # Method diversity bonus
        methods = set(table.extraction_method for table in tables)
        method_bonus = min(len(methods) * 0.1, 0.3)
        
        return min(1.0, avg_confidence + dg_bonus + method_bonus)

    def _serialize_table(self, table: ExtractedTable) -> Dict[str, Any]:
        """Serialize table for caching"""
        return {
            'cells': [[{
                'content': cell.content,
                'bbox': cell.bbox,
                'row': cell.row,
                'column': cell.column,
                'confidence': cell.confidence,
                'cell_type': cell.cell_type
            } for cell in row] for row in table.cells],
            'headers': table.headers,
            'rows': table.rows,
            'bbox': table.bbox,
            'page_number': table.page_number,
            'table_type': table.table_type,
            'confidence': table.confidence,
            'extraction_method': table.extraction_method
        }

# Service instance
table_extractor = AdvancedTableExtractor()