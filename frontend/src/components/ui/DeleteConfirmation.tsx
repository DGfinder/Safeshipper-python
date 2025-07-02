'use client'

import React from 'react'
import { ExclamationTriangleIcon, TrashIcon } from '@heroicons/react/24/outline'

interface DeleteConfirmationProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
}

export default function DeleteConfirmation({
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false
}: DeleteConfirmationProps) {
  return (
    <div className="space-y-6">
      {/* Warning Icon */}
      <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
        <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
      </div>

      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600">
          {message}
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          disabled={isLoading}
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Deleting...
            </>
          ) : (
            <>
              <TrashIcon className="w-4 h-4 mr-2" />
              {confirmText}
            </>
          )}
        </button>
      </div>
    </div>
  )
} 