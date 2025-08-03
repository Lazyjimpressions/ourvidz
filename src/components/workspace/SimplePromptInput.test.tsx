import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimplePromptInput } from './SimplePromptInput';

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea value={value} onChange={onChange} {...props} />
  ),
}));

jest.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
  TooltipProvider: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => <div>{children}</div>,
}));

describe('SimplePromptInput', () => {
  const defaultProps = {
    prompt: '',
    onPromptChange: jest.fn(),
    mode: 'image' as const,
    contentType: 'nsfw' as const,
    isGenerating: false,
    onGenerate: jest.fn(),
    referenceImage: null,
    onReferenceImageChange: jest.fn(),
    referenceStrength: 0.85,
    onReferenceStrengthChange: jest.fn(),
    onModeChange: jest.fn(),
    onContentTypeChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders mode toggle buttons', () => {
    render(<SimplePromptInput {...defaultProps} />);
    
    expect(screen.getByText('IMAGE')).toBeInTheDocument();
    expect(screen.getByText('VIDEO')).toBeInTheDocument();
  });

  it('renders content type toggle buttons', () => {
    render(<SimplePromptInput {...defaultProps} />);
    
    expect(screen.getByText('SFW')).toBeInTheDocument();
    expect(screen.getByText('NSFW')).toBeInTheDocument();
  });

  it('renders generate button', () => {
    render(<SimplePromptInput {...defaultProps} />);
    
    expect(screen.getByText('Generate')).toBeInTheDocument();
  });

  it('calls onModeChange when mode buttons are clicked', () => {
    render(<SimplePromptInput {...defaultProps} />);
    
    fireEvent.click(screen.getByText('VIDEO'));
    expect(defaultProps.onModeChange).toHaveBeenCalledWith('video');
    
    fireEvent.click(screen.getByText('IMAGE'));
    expect(defaultProps.onModeChange).toHaveBeenCalledWith('image');
  });

  it('calls onContentTypeChange when content type buttons are clicked', () => {
    render(<SimplePromptInput {...defaultProps} />);
    
    fireEvent.click(screen.getByText('SFW'));
    expect(defaultProps.onContentTypeChange).toHaveBeenCalledWith('sfw');
    
    fireEvent.click(screen.getByText('NSFW'));
    expect(defaultProps.onContentTypeChange).toHaveBeenCalledWith('nsfw');
  });

  it('calls onGenerate when generate button is clicked', () => {
    render(<SimplePromptInput {...defaultProps} prompt="test prompt" />);
    
    fireEvent.click(screen.getByText('Generate'));
    expect(defaultProps.onGenerate).toHaveBeenCalled();
  });

  it('disables generate button when prompt is empty', () => {
    render(<SimplePromptInput {...defaultProps} prompt="" />);
    
    const generateButton = screen.getByText('Generate');
    expect(generateButton).toBeDisabled();
  });

  it('disables generate button when generating', () => {
    render(<SimplePromptInput {...defaultProps} isGenerating={true} prompt="test" />);
    
    const generateButton = screen.getByText('Generating...');
    expect(generateButton).toBeDisabled();
  });

  it('shows correct placeholder based on mode', () => {
    const { rerender } = render(<SimplePromptInput {...defaultProps} mode="image" />);
    
    expect(screen.getByPlaceholderText(/A beautiful woman in a coffee shop/)).toBeInTheDocument();
    
    rerender(<SimplePromptInput {...defaultProps} mode="video" />);
    expect(screen.getByPlaceholderText(/The woman sips from a cup of coffee/)).toBeInTheDocument();
  });
}); 