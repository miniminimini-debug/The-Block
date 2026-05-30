import { Component, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // In production, send to error tracking (Sentry, etc.)
    if (__DEV__) {
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>🌙</Text>
          <Text style={styles.title}>something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message ?? 'the block hit a quiet moment. tap to try again.'}
          </Text>
          <Pressable onPress={this.reset} style={styles.btn}>
            <Text style={styles.btnText}>try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08080F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  emoji: { fontSize: 48 },
  title: { fontSize: 20, color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  message: { fontSize: 14, color: '#5A5A7A', fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 21 },
  btn: {
    marginTop: 8,
    backgroundColor: '#6B52E0',
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  btnText: { color: '#EEEEF8', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
