import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { aiAPI } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

/**
 * Analysis Modal Component
 * Allows users to select analysis options for a document
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether the modal is visible
 * @param {Function} props.onClose - Function to call when closing the modal
 * @param {Function} props.onComplete - Function to call when analysis is complete
 * @param {string} props.documentId - ID of the document to analyze
 */
const AnalysisModal = ({ visible, onClose, onComplete, documentId }) => {
  // Theme hooks
  const { colors, isDark } = useTheme();
  
  // States
  const [selectedAnalysisType, setSelectedAnalysisType] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customPrompt, setCustomPrompt] = useState('');
  
  // Analysis options
  const analysisOptions = [
    {
      id: 'summary',
      title: 'Summary',
      description: 'Generate a concise summary of the document',
      icon: 'document-text-outline',
    },
    {
      id: 'entities',
      title: 'Entity Extraction',
      description: 'Extract people, organizations, and key concepts',
      icon: 'people-outline',
    },
    {
      id: 'sentiment',
      title: 'Sentiment Analysis',
      description: 'Analyze the overall sentiment and tone',
      icon: 'analytics-outline',
    },
    {
      id: 'custom',
      title: 'Custom Analysis',
      description: 'Create a custom analysis prompt',
      icon: 'create-outline',
    },
  ];
  
  // Styles
  const styles = StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: Platform.OS === 'ios' 
        ? 'rgba(0, 0, 0, 0.5)' 
        : 'transparent',
      justifyContent: 'flex-end',
    },
    contentContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '80%',
      paddingBottom: Platform.OS === 'ios' ? 40 : 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 5,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
    },
    closeButton: {
      padding: 4,
    },
    scrollContent: {
      paddingHorizontal: 16,
    },
    instructionText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginVertical: 16,
    },
    optionCard: {
      backgroundColor: colors.background,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 2,
      padding: 16,
    },
    optionCardSelected: {
      borderColor: colors.primary,
    },
    optionCardUnselected: {
      borderColor: 'transparent',
    },
    optionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 12,
    },
    optionDescription: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    customInputContainer: {
      backgroundColor: colors.background,
      borderRadius: 12,
      marginTop: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    customPromptInput: {
      color: colors.text,
      height: 100,
      textAlignVertical: 'top',
      paddingTop: 8,
      paddingBottom: 8,
    },
    buttonContainer: {
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    },
    analyzeButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    analyzeButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
    disabledButton: {
      opacity: 0.6,
    },
    errorText: {
      color: colors.error,
      fontSize: 14,
      marginTop: 8,
      marginBottom: 8,
    },
  });
  
  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!visible) {
      setError(null);
      setLoading(false);
    }
  }, [visible]);
  
  // Handle option selection
  const handleSelectOption = (optionId) => {
    setSelectedAnalysisType(optionId);
  };
  
  // Handle custom prompt change
  const handleCustomPromptChange = (text) => {
    setCustomPrompt(text);
  };
  
  // Handle analyze button press
  const handleAnalyze = async () => {
    if (!documentId) {
      setError('Document ID is missing');
      return;
    }
    
    // Validate inputs
    if (selectedAnalysisType === 'custom' && !customPrompt.trim()) {
      setError('Please enter a custom analysis prompt');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Prepare analysis options
      const options = {
        analysisType: selectedAnalysisType,
      };
      
      if (selectedAnalysisType === 'custom') {
        options.customPrompt = customPrompt.trim();
      }
      
      // Call AI service API
      const response = await aiAPI.analyzeDocument(documentId, options);
      
      if (response.data) {
        // Pass analysis results to parent component
        onComplete(response.data);
      } else {
        setError('Failed to analyze document');
        setLoading(false);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze document');
      setLoading(false);
    }
  };
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.contentContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>Analyze Document</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Content */}
          <ScrollView style={styles.scrollContent}>
            <Text style={styles.instructionText}>
              Choose the type of analysis you want to perform on this document.
            </Text>
            
            {/* Error message */}
            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
            
            {/* Analysis options */}
            {analysisOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  selectedAnalysisType === option.id
                    ? styles.optionCardSelected
                    : styles.optionCardUnselected,
                ]}
                onPress={() => handleSelectOption(option.id)}
                disabled={loading}
              >
                <View style={styles.optionHeader}>
                  <Ionicons 
                    name={option.icon} 
                    size={24} 
                    color={selectedAnalysisType === option.id ? colors.primary : colors.text} 
                  />
                  <Text style={styles.optionTitle}>{option.title}</Text>
                </View>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
            
            {/* Custom prompt input */}
            {selectedAnalysisType === 'custom' && (
              <View style={styles.customInputContainer}>
                <Text style={[styles.optionDescription, { marginBottom: 8 }]}>
                  Enter your custom analysis prompt:
                </Text>
                <TextInput
                  style={styles.customPromptInput}
                  multiline
                  numberOfLines={4}
                  placeholder="E.g., Extract all dates and deadlines from this document..."
                  placeholderTextColor={colors.textSecondary}
                  value={customPrompt}
                  onChangeText={handleCustomPromptChange}
                  editable={!loading}
                />
              </View>
            )}
          </ScrollView>
          
          {/* Action button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.analyzeButton,
                loading && styles.disabledButton,
              ]}
              onPress={handleAnalyze}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.analyzeButtonText}>Analyze Document</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AnalysisModal;