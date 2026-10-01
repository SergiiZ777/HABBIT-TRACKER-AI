import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

const PARTICLES = ['🎉', '✨', '🎊', '⭐️', '💫'];
const COUNT = 12;
const DURATION = 700;
const DISMISS_AFTER = 1200;

type Particle = { emoji: string; angle: number; distance: number; delay: number };

function ConfettiParticle({ emoji, angle, distance, delay }: Particle) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration: DURATION, easing: Easing.out(Easing.cubic) }));
  }, [delay, progress]);

  const style = useAnimatedStyle(() => {
    const dx = Math.cos(angle) * distance * progress.value;
    const dy = Math.sin(angle) * distance * progress.value - 20 * progress.value;
    return {
      opacity: 1 - progress.value,
      transform: [{ translateX: dx }, { translateY: dy }, { scale: 1 - 0.3 * progress.value }],
    };
  });

  return <Animated.Text style={[styles.particle, style]}>{emoji}</Animated.Text>;
}

type Props = { onDone?: () => void };

/** A short-lived celebration burst — mount it conditionally, it removes itself via `onDone`. */
export function ConfettiBurst({ onDone }: Props) {
  // useState's lazy initializer is the React-endorsed place for a one-time impure
  // computation (it's guaranteed to run exactly once, unlike useMemo's factory) — this
  // component is freshly mounted each time a celebration starts, so "once per mount" is
  // exactly the "once per burst" randomization this needs.
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      emoji: PARTICLES[i % PARTICLES.length],
      angle: (Math.PI * 2 * i) / COUNT + (Math.random() - 0.5) * 0.4,
      distance: 60 + Math.random() * 50,
      delay: Math.random() * 100,
    }))
  );

  useEffect(() => {
    const id = setTimeout(() => onDone?.(), DISMISS_AFTER);
    return () => clearTimeout(id);
  }, [onDone]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <ConfettiParticle key={i} {...p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', left: '50%', top: '50%', fontSize: 20 },
});
