"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageTemplate from '@/components/layout/PageTemplate';
import { 
  DocumentMagnifyingGlassIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface Match {
  keyword: string;
  dg_class: string;
  page_number: number;
  line_snippet: string;
}

interface SearchHistory {
  id: string;
  filename: string;
  pages_searched: number;
  results_found: number;
  date: string;
}

export default function ManifestSearchPage(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Mock search history data
  const [searchHistory] = useState<SearchHistory[]>([
    {
      id: '1',
      filename: '695637717.3909516-scan-check.pdf',
      pages_searched: 87,
      results_found: 16,
      date: '10:14:50 19.10.2023'
    },
    {
      id: '2',
      filename: '695637717.3909516-scan-check.pdf',
      pages_searched: 87,
      results_found: 16,
      date: '10:14:50 19.10.2023'
    },
    {
      id: '3',
      filename: '695637717.3909516-scan-check.pdf',
      pages_searched: 87,
      results_found: 16,
      date: '10:14:50 19.10.2023'
    },
    {
      id: '4',
      filename: '695637717.3909516-scan-check.pdf',
      pages_searched: 87,
      results_found: 16,
      date: '10:14:50 19.10.2023'
    },
    {
      id: '5',
      filename: '695637717.3909516-scan-check.pdf',
      pages_searched: 87,
      results_found: 16,
      date: '10:14:50 19.10.2023'
    }
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File must be under 5MB');
        return;
      }
      if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setError('Only PDF files are supported');
        return;
      }
      setFile(selectedFile);
      setError('');
      setResults([]);
    }
  };

  const handleSearch = async () => {
    if (!file) return;
    
    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('pdf_file', file);
    
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch('/api/v1/manifest-search/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.matches || []);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch (err) {
      setError('Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setResults([]);
    setError('');
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const getDGClassColor = (dgClass: string): string => {
    const colors: Record<string, string> = {
      '1': 'bg-red-100 text-red-800 border-red-300',
      '2': 'bg-green-100 text-green-800 border-green-300', 
      '3': 'bg-orange-100 text-orange-800 border-orange-300',
      '4': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      '5': 'bg-blue-100 text-blue-800 border-blue-300',
      '6': 'bg-purple-100 text-purple-800 border-purple-300',
      '7': 'bg-pink-100 text-pink-800 border-pink-300',
      '8': 'bg-indigo-100 text-indigo-800 border-indigo-300',
      '9': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    const mainClass = dgClass.split('.')[0];
    return colors[mainClass] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <PageTemplate 
      title="Manifest Search (DG Identification)"
      description="Search your shipment manifest to find dangerous goods"
      actions={
        <Button className="bg-[#153F9F] hover:bg-[#1230a0] text-white">
          Add media from URL
        </Button>
      }
    >
      {/* Upload Card */}
            <div className="bg-white shadow-[0px_4px_18px_rgba(75,70,92,0.1)] rounded-md">
              <div className="flex justify-between items-center p-6 pb-0">
                <h2 className="font-['Poppins'] font-bold text-[18px] leading-[24px] flex-1">
                  Search your shipment manifest to find dangerous goods
                </h2>
                <span className="font-['Poppins'] font-semibold text-[15px] leading-[22px] text-[#153F9F]">
                  Add media from URL
                </span>
              </div>

              <div className="p-6">
                <div className="border border-dashed border-[#F4F4F4] rounded-md p-10 flex flex-col items-center gap-3">
                  <div className="w-[38px] h-[38px] bg-[rgba(75,70,92,0.08)] rounded-md flex items-center justify-center p-[5px]">
                    <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  
                  <h3 className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
                    Drag and Drop your Manifest here
                  </h3>
                  
                  <span className="font-['Poppins'] font-normal text-[15px] leading-[22px] text-gray-600">
                    or
                  </span>
                  
                  <div className="bg-[rgba(115,103,240,0.16)] rounded-md">
                    <input
                      id="pdf-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="flex items-center px-5 py-[10px] gap-3 cursor-pointer"
                    >
                      <span className="font-['Poppins'] font-medium text-[15px] leading-[18px] tracking-[0.43px] text-[#153F9F]">
                        Browse File
                      </span>
                    </label>
                  </div>
                </div>

                {file && (
                  <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <DocumentMagnifyingGlassIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{file.name}</p>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSearch}
                          disabled={loading}
                          className="bg-[#153F9F] hover:bg-[#1230a0] text-white"
                        >
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Analyzing...
                            </>
                          ) : (
                            'Search for Dangerous Goods'
                          )}
                        </Button>
                        <Button variant="outline" onClick={handleClear}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive" className="border-red-300">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Results Section */}
            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((match, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className={`font-medium border ${getDGClassColor(match.dg_class)}`}>
                            Class {match.dg_class}
                          </Badge>
                          <span className="font-semibold text-gray-900 capitalize">
                            {match.keyword}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Page {match.page_number}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded border-l-4 border-[#153F9F]">
                          "{match.line_snippet}"
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Previously Searched Table */}
            <div className="bg-white shadow-[0px_4px_18px_rgba(75,70,92,0.1)] rounded-md">
              <div className="p-6 pb-4">
                <h3 className="font-['Poppins'] font-bold text-[18px] leading-[24px]">
                  Previously searched
                </h3>
              </div>
              
              <div className="border-t border-[#F4F4F4]"></div>
              
              <div className="p-6 pt-4">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-[14px]">
                    <select className="bg-white border border-[#F4F4F4] rounded-md px-[14px] py-[7px] font-['Poppins'] font-normal text-[15px] leading-[24px]">
                      <option>10</option>
                      <option>25</option>
                      <option>50</option>
                    </select>
                  </div>
                  <div className="w-[200px]">
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full bg-white border border-[#F4F4F4] rounded-md px-[14px] py-[7px] font-['Poppins'] font-normal text-[15px] leading-[24px]"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="border border-[#F4F4F4] rounded-md overflow-hidden">
                  {/* Table Header */}
                  <div className="flex bg-gray-50 border-b border-[#F4F4F4]">
                    <div className="flex-1 p-4 flex items-center gap-1">
                      <span className="font-['Poppins'] font-medium text-[13px] leading-[20px] tracking-[1px] uppercase text-gray-600">
                        FILE
                      </span>
                      <div className="flex flex-col">
                        <ChevronUpIcon className="w-[18px] h-[18px] text-gray-400 -mb-1" />
                        <ChevronDownIcon className="w-[18px] h-[18px] text-gray-400" />
                      </div>
                    </div>
                    <div className="w-[190px] p-4 flex items-center gap-1">
                      <span className="font-['Poppins'] font-medium text-[13px] leading-[20px] tracking-[1px] uppercase text-gray-600">
                        PAGES SEARCHED
                      </span>
                      <div className="flex flex-col">
                        <ChevronUpIcon className="w-[18px] h-[18px] text-gray-400 -mb-1" />
                        <ChevronDownIcon className="w-[18px] h-[18px] text-gray-400" />
                      </div>
                    </div>
                    <div className="w-[190px] p-4 flex items-center gap-1">
                      <span className="font-['Poppins'] font-medium text-[13px] leading-[20px] tracking-[1px] uppercase text-gray-600">
                        RESULTS FOUND
                      </span>
                      <div className="flex flex-col">
                        <ChevronUpIcon className="w-[18px] h-[18px] text-gray-400 -mb-1" />
                        <ChevronDownIcon className="w-[18px] h-[18px] text-gray-400" />
                      </div>
                    </div>
                    <div className="w-[186px] p-4 flex items-center gap-1">
                      <span className="font-['Poppins'] font-medium text-[13px] leading-[20px] tracking-[1px] uppercase text-gray-600">
                        DATE
                      </span>
                      <div className="flex flex-col">
                        <ChevronUpIcon className="w-[18px] h-[18px] text-gray-400 -mb-1" />
                        <ChevronDownIcon className="w-[18px] h-[18px] text-gray-400" />
                      </div>
                    </div>
                    <div className="w-[100px] p-4">
                      <span className="font-['Poppins'] font-medium text-[13px] leading-[20px] tracking-[1px] uppercase text-gray-600">
                        ACTIONS
                      </span>
                    </div>
                  </div>

                  {/* Table Body */}
                  {searchHistory.map((item) => (
                    <div key={item.id} className="flex border-b border-[#F4F4F4] hover:bg-gray-50">
                      <div className="flex-1 p-5 flex items-center gap-[10px]">
                        <svg className="w-6 h-6 text-gray-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                        <span className="font-['Poppins'] font-semibold text-[15px] leading-[22px] text-gray-900">
                          {item.filename}
                        </span>
                      </div>
                      <div className="w-[190px] p-5 flex items-center">
                        <span className="font-['Poppins'] font-semibold text-[15px] leading-[22px] text-gray-900">
                          {item.pages_searched}
                        </span>
                      </div>
                      <div className="w-[190px] p-5 flex items-center">
                        <span className="font-['Poppins'] font-semibold text-[15px] leading-[22px] text-gray-900">
                          {item.results_found}
                        </span>
                      </div>
                      <div className="w-[186px] p-5 flex items-center">
                        <span className="font-['Poppins'] font-normal text-[15px] leading-[22px] text-gray-700">
                          {item.date}
                        </span>
                      </div>
                      <div className="w-[100px] p-5 flex items-center gap-4">
                        <button className="text-gray-400 hover:text-gray-600">
                          <EyeIcon className="w-[22px] h-[22px]" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <TrashIcon className="w-[22px] h-[22px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center mt-4">
                  <span className="font-['Poppins'] font-normal text-[13px] leading-[20px] text-gray-700">
                    Showing 1 to 10 of 100 entries
                  </span>
                  <div className="flex gap-1">
                    <button className="px-[10px] py-[6px] bg-[rgba(75,70,92,0.08)] rounded-md font-['Poppins'] font-medium text-[15px] leading-[18px] tracking-[0.43px]">
                      Previous
                    </button>
                    <button className="px-3 py-[10px] bg-[#153F9F] text-white rounded-md shadow-[0px_2px_4px_rgba(165,163,174,0.3)] font-['Poppins'] font-medium text-[15px] leading-[18px] tracking-[0.43px]">
                      1
                    </button>
                    <button className="px-3 py-[10px] bg-[rgba(75,70,92,0.08)] rounded-md font-['Poppins'] font-medium text-[15px] leading-[18px] tracking-[0.43px]">
                      2
                    </button>
                    <button className="px-3 py-[10px] bg-[rgba(75,70,92,0.16)] rounded-md font-['Poppins'] font-medium text-[15px] leading-[18px] tracking-[0.43px]">
                      3
                    </button>
                    <button className="px-3 py-[10px] bg-[rgba(75,70,92,0.08)] rounded-md font-['Poppins'] font-medium text-[15px] leading-[18px] tracking-[0.43px]">
                      4
                    </button>
                    <button className="px-3 py-[10px] bg-[rgba(75,70,92,0.08)] rounded-md font-['Poppins'] font-medium text-[15px] leading-[18px] tracking-[0.43px]">
                      5
                    </button>
                    <button className="px-[10px] py-[6px] bg-[rgba(75,70,92,0.08)] rounded-md font-['Poppins'] font-medium text-[15px] leading-[18px] tracking-[0.43px]">
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>

    </PageTemplate>
  );
}