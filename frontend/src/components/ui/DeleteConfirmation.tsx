import * as React from "react"
import { Modal } from "./Modal"
import { Button } from "./button"

interface DeleteConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  isLoading?: boolean
  confirmText?: string
  cancelText?: string
}

export const DeleteConfirmation = React.forwardRef<HTMLDivElement, DeleteConfirmationProps>(
  ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    isLoading = false,
    confirmText = "Delete",
    cancelText = "Cancel"
  }, ref) => {
    const handleConfirm = () => {
      onConfirm()
    }

    return (
      <Modal
        ref={ref}
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        className="max-w-md"
      >
        <div className="space-y-4">
          {/* Warning Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          
          {/* Message */}
          <div className="text-center">
            <p className="text-sm text-gray-500">{message}</p>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              loading={isLoading}
              disabled={isLoading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </Modal>
    )
  }
)

DeleteConfirmation.displayName = "DeleteConfirmation"

export default DeleteConfirmation
