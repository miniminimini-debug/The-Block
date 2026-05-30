import { forwardRef, useState } from 'react';
import { TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { BlockText } from './Text';

interface BlockInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  rightElement?: React.ReactNode;
}

export const BlockInput = forwardRef<TextInput, BlockInputProps>(
  ({ label, error, hint, containerStyle, rightElement, onFocus, onBlur, ...rest }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View style={containerStyle}>
        {label && (
          <BlockText preset="label" className="mb-1.5 ml-0.5 uppercase tracking-widest">
            {label}
          </BlockText>
        )}

        <MotiView
          animate={{
            borderColor: error
              ? '#FF6B6B'
              : isFocused
              ? '#8B76F0'
              : '#2E2E48',
          }}
          transition={{ type: 'timing', duration: 150 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1.5,
            borderRadius: 16,
            backgroundColor: '#1A1A28',
            paddingHorizontal: 16,
            paddingVertical: 14,
          }}
        >
          <TextInput
            ref={ref}
            style={{
              flex: 1,
              fontSize: 15,
              color: '#EEEEF8',
              fontFamily: 'Inter_400Regular',
              padding: 0,
            }}
            placeholderTextColor="#7A7A9A"
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
          {rightElement}
        </MotiView>

        {error ? (
          <BlockText preset="caption" className="text-block-error ml-1 mt-1">
            {error}
          </BlockText>
        ) : hint ? (
          <BlockText preset="caption" className="ml-1 mt-1">
            {hint}
          </BlockText>
        ) : null}
      </View>
    );
  }
);

BlockInput.displayName = 'BlockInput';
