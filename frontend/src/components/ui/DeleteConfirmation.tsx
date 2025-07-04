import Modal from './Modal'
import Button from './button'

interface DeleteConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  message?: string
  loading?: boolean
}

export function DeleteConfirmation({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this item? This action cannot be undone.',
  loading = false,
}: DeleteConfirmationProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '3rem', 
          color: '#ef4444', 
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'center'
        }}>
          ⚠️
        </div>
        <p style={{ 
          marginBottom: '1.5rem', 
          color: '#374151',
          fontSize: '1rem',
          lineHeight: '1.5'
        }}>
          {message}
        </p>
        <div style={{ 
          display: 'flex', 
          gap: '0.75rem', 
          justifyContent: 'center' 
        }}>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            loading={loading}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default DeleteConfirmation
