"use client";

import React from 'react';
import Navigation from './Navigation';

interface PageTemplateProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export default function PageTemplate({ 
  title, 
  description, 
  children, 
  actions 
}: PageTemplateProps) {
  return (
    <div className="flex min-h-screen bg-[#F8F7FA]">
      <Navigation />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <div className="bg-white shadow-[0px_2px_4px_rgba(165,163,174,0.3)] rounded-md mx-4 mt-4 p-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-lg opacity-0">
              <div className="relative">
                <svg className="w-[26px] h-[26px] absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" viewBox="0 0 26 26" fill="currentColor">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search (Ctrl+/)"
                  className="w-full pl-12 pr-4 py-2 font-['Poppins'] font-normal text-[15px] leading-[22px] border-0 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-[26px] h-[26px] bg-gray-200 rounded-full"></div>
                <div className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#EA5455] rounded-full flex items-center justify-center">
                  <span className="text-white font-['Poppins'] font-medium text-[13px] leading-[14px]">4</span>
                </div>
              </div>
              <div className="w-[38px] h-[38px] bg-[#153F9F] rounded-full flex items-center justify-center">
                <span className="text-white font-medium">JD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 p-4">
          <div className="max-w-[1126px] space-y-[26px]">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-['Poppins'] font-bold text-[22px] leading-[30px] text-gray-900">
                  {title}
                </h1>
                {description && (
                  <p className="font-['Poppins'] font-normal text-[15px] leading-[22px] text-gray-600 mt-1">
                    {description}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex gap-2">
                  {actions}
                </div>
              )}
            </div>

            {/* Page Content */}
            {children}

            {/* Footer */}
            <div className="text-center py-3">
              <p className="font-['Poppins'] font-normal text-[15px] leading-[22px] text-gray-600">
                © 2023, made with ❤️ by SafeShipper Team
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}