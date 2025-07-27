// mobile/src/components/SignatureCapture.tsx
import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

interface SignatureCaptureProps {
  onSignatureCapture: (signature: string) => void;
  onCancel?: () => void;
  recipientName?: string;
  style?: any;
}

const SignatureCapture: React.FC<SignatureCaptureProps> = ({
  onSignatureCapture,
  onCancel,
  recipientName,
  style,
}) => {
  const signatureRef = useRef<any>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const handleSignature = (signature: string) => {
    setHasSignature(true);
    onSignatureCapture(signature);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setHasSignature(false);
  };

  const handleConfirm = () => {
    if (!hasSignature) {
      Alert.alert('Signature Required', 'Please provide a signature before confirming.');
      return;
    }
    signatureRef.current?.readSignature();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const signatureStyle = `
    .m-signature-pad {
      border: 2px solid #2563EB;
      border-radius: 8px;
      background-color: #ffffff;
    }
    .m-signature-pad--body {
      border: none;
    }
    .m-signature-pad--footer {
      display: none;
    }
    body { 
      margin: 0; 
      padding: 16px;
      background-color: #f8fafc;
    }
  `;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>Signature Capture</Text>
        {recipientName && (
          <Text style={styles.subtitle}>
            Please sign to confirm receipt: <Text style={styles.recipientName}>{recipientName}</Text>
          </Text>
        )}
      </View>

      <View style={styles.signatureContainer}>
        <SignatureScreen
          ref={signatureRef}
          onOK={handleSignature}
          onEmpty={() => setHasSignature(false)}
          descriptionText="Sign above to confirm delivery"
          clearText="Clear"
          confirmText="Confirm"
          webStyle={signatureStyle}
          autoClear={false}
          imageType="image/png"
          dataURL=""
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.confirmButton,
            !hasSignature && styles.disabledButton,
          ]}
          onPress={handleConfirm}
          disabled={!hasSignature}>
          <Text style={[styles.confirmButtonText, !hasSignature && styles.disabledButtonText]}>
            Confirm
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.instruction}>
        Use your finger to sign in the box above. The signature will be used as proof of delivery.
      </Text>
    </View>
  );
};

const {width, height} = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  recipientName: {
    fontWeight: '600',
    color: '#2563eb',
  },
  signatureContainer: {
    flex: 1,
    minHeight: 300,
    maxHeight: height * 0.5,
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  clearButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  clearButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  cancelButtonText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#2563eb',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
    borderColor: '#d1d5db',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  instruction: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default SignatureCapture;