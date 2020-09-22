import React, { useRef, useCallback } from 'react';
import {
  StyleSheet,
  Image,
  ImageRequireSource,
  ViewStyle,
  Dimensions,
} from 'react-native';
import Animated, {
  withTiming,
  useSharedValue,
  useAnimatedStyle,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import {
  PinchGestureHandler,
  TapGestureHandler,
  State,
  PinchGestureHandlerGestureEvent,
  TapGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import * as vec from './vectors';
import { useAnimatedGestureHandler } from './useAnimatedGestureHandler';
import {
  fixGestureHandler,
  clamp,
  workletNoop,
  useAnimatedReaction,
} from './utils';

const styles = {
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
};

const defaultConstants = {
  MAX_SCALE: 2,
  MIN_SCALE: 0.7,
  OVER_SCALE: 0.5,
};

const defaultTimingConfig = {
  duration: 250,
  easing: Easing.bezier(0.33, 0.01, 0, 1),
};

export interface SimpleScalableImageReusableProps {
  MAX_SCALE?: number;
  MIN_SCALE?: number;
  OVER_SCALE?: number;
  onDoubleTap?: (isScaled: boolean) => void;
  onInteraction?: (type: 'scale' | 'pan') => void;
}

export interface SimpleScalableImageProps
  extends SimpleScalableImageReusableProps {
  outerGestureHandlerRefs?: React.Ref<any>[];
  source?: ImageRequireSource;
  uri?: string;
  width: number;
  height: number;
  windowDimensions: {
    width: number;
    height: number;
  };
  onStateChange?: (isActive: boolean) => void;
  isActive?: Animated.SharedValue<boolean>;
  outerGestureHandlerActive?: Animated.SharedValue<boolean>;
  springConfig?: Animated.WithSpringConfig;
  timingConfig?: Animated.TimingConfig;
  style?: ViewStyle;
  enabled?: boolean;
}

const AnimatedImageComponent = Animated.createAnimatedComponent(
  Image,
);

export const SimpleScalableImage = React.memo<
  SimpleScalableImageProps
>(
  ({
    outerGestureHandlerRefs = [],
    source,
    uri,
    width,
    height,
    onStateChange = workletNoop,
    windowDimensions = Dimensions.get('window'),
    isActive,
    outerGestureHandlerActive,
    style,
    onDoubleTap = workletNoop,
    onInteraction = workletNoop,
    MAX_SCALE = defaultConstants.MAX_SCALE,
    MIN_SCALE = defaultConstants.MIN_SCALE,
    OVER_SCALE = defaultConstants.OVER_SCALE,
    timingConfig = defaultTimingConfig,
    enabled = true,
    dataCount,
  }) => {
    fixGestureHandler();

    if (typeof source === 'undefined' && typeof uri === 'undefined') {
      throw new Error(
        'SimpleScalableImage: either source or uri should be passed to display an image',
      );
    }

    const imageSource = source ?? {
      uri: uri!,
    };

    const interactionsEnabled = useSharedValue(false);
    const setInteractionsEnabled = useCallback((value: boolean) => {
      interactionsEnabled.value = value;
    }, []);
    const onLoadImageSuccess = useCallback(() => {
      setInteractionsEnabled(true);
    }, []);

    const pinchRef = useRef(null);
    const panRef = useRef(null);
    const tapRef = useRef(null);
    const doubleTapRef = useRef(null);

    const pinchState = useSharedValue<State>(State.UNDETERMINED);

    const zindex = useSharedValue(-1);
    const scale = useSharedValue(1);
    const scaleOffset = useSharedValue(1);
    const translation = vec.useSharedVector(0, 0);
    const scaleTranslation = vec.useSharedVector(0, 0);
    const offset = vec.useSharedVector(0, 0);

    const canvas = vec.create(width, height);
    const targetWidth = windowDimensions.width;
    const scaleFactor = width / targetWidth;
    const targetHeight = height / scaleFactor;

    // TODO: check
    function resetSharedState(animated?: boolean) {
      'worklet';

      if (animated) {
        scale.value = withTiming(1, timingConfig);
        scaleOffset.value = 1;

        vec.set(offset, () => withTiming(0, timingConfig));
      } else {
        scale.value = 1;
        scaleOffset.value = 1;
        vec.set(translation, 0);
        vec.set(scaleTranslation, 0);
        vec.set(offset, 0);
      }
    }

    useAnimatedReaction(
      () => {
        'worklet';

        if (typeof isActive === 'undefined') {
          return true;
        }

        return isActive.value;
      },
      (currentActive) => {
        'worklet';

        if (!currentActive) {
          resetSharedState();
        }
      },
    );

    const onScaleEvent = useAnimatedGestureHandler<
      PinchGestureHandlerGestureEvent,
      {
        origin: vec.Vector<number>;
        adjustFocal: vec.Vector<number>;
        gestureScale: number;
        nextScale: number;
      }
    >({
      onInit: (_, ctx) => {
        ctx.origin = vec.create(0, 0);
        ctx.gestureScale = 1;
      },

      shouldHandleEvent: (evt) => {
        return (
          evt.numberOfPointers === 2 &&
          typeof outerGestureHandlerActive !== 'undefined' &&
          !outerGestureHandlerActive.value &&
          interactionsEnabled.value
        );
      },

      beforeEach: (evt, ctx) => {
        // calculate the overall scale value
        // also limits this.event.scale
        ctx.nextScale = clamp(
          evt.scale * scaleOffset.value,
          MIN_SCALE,
          MAX_SCALE + OVER_SCALE,
        );

        if (
          ctx.nextScale > MIN_SCALE &&
          ctx.nextScale < MAX_SCALE + OVER_SCALE
        ) {
          ctx.gestureScale = evt.scale;
        }

        // this is just to be able to use with vectors
        const focal = vec.create(evt.focalX, evt.focalY);
        const CENTER = vec.divide(canvas, 2);

        // focal with translate offset
        // it alow us to scale into different point even then we pan the image
        ctx.adjustFocal = vec.sub(focal, vec.add(CENTER, offset));
      },

      afterEach: (evt, ctx) => {
        if (evt.state === 5) {
          return;
        }

        scale.value = ctx.nextScale;
      },

      onStart: (_, ctx) => {
        onInteraction('scale');
        cancelAnimation(offset.x);
        cancelAnimation(offset.y);
        vec.set(ctx.origin, ctx.adjustFocal);
        zindex.value = 10;
      },

      onActive: (evt, ctx) => {
        pinchState.value = evt.state;

        const pinch = vec.sub(ctx.adjustFocal, ctx.origin);

        const nextTranslation = vec.add(
          pinch,
          ctx.origin,
          vec.multiply(-1, ctx.gestureScale, ctx.origin),
        );

        vec.set(scaleTranslation, nextTranslation);
      },

      onEnd: () => {
        scaleTranslation.x.value = withTiming(0, timingConfig, () => {
          zindex.value = -1;
        });
        scaleTranslation.y.value = withTiming(0, timingConfig);

        scale.value = withTiming(1, timingConfig);
        scaleOffset.value = 1;
      },
    });

    const onDoubleTapEvent = useAnimatedGestureHandler<
      TapGestureHandlerGestureEvent,
      {}
    >({
      shouldHandleEvent: (evt) => {
        return (
          evt.numberOfPointers === 1 &&
          typeof outerGestureHandlerActive !== 'undefined' &&
          !outerGestureHandlerActive.value &&
          interactionsEnabled.value
        );
      },

      onActive: () => {
        onDoubleTap(scale.value > 1);
        console.log('Double tap for like');
      },
    });

    const animatedStyles = useAnimatedStyle<ViewStyle>(() => {
      const noOffset = offset.x.value === 0 && offset.y.value === 0;
      const noTranslation =
        translation.x.value === 0 && translation.y.value === 0;
      const noScaleTranslation =
        scaleTranslation.x.value === 0 &&
        scaleTranslation.y.value === 0;

      const isInactive =
        scale.value === 1 &&
        noOffset &&
        noTranslation &&
        noScaleTranslation;

      onStateChange(isInactive);

      return {
        transform: [
          {
            translateX:
              scaleTranslation.x.value +
              translation.x.value +
              offset.x.value,
          },
          {
            translateY:
              scaleTranslation.y.value +
              translation.y.value +
              offset.y.value,
          },
          { scale: scale.value },
        ],
      };
    });

    const animatedBlackStyles = useAnimatedStyle(() => {
      return {
        backgroundColor: 'black',
        opacity: 1 - 1 / scale.value + 0.1,
        zIndex: 0,
        flex: 1,
        transform: [
          {
            scale: scale.value > 1 ? 10 : 0,
          },
        ],
      };
    });

    return (
      <Animated.View style={[styles.container, { width }, style]}>
        <Animated.View style={animatedBlackStyles} />
        <PinchGestureHandler
          enabled={enabled}
          ref={pinchRef}
          onGestureEvent={onScaleEvent}
          simultaneousHandlers={[
            panRef,
            tapRef,
            ...outerGestureHandlerRefs,
          ]}
        >
          <Animated.View style={[styles.wrapper]}>
            <TapGestureHandler
              enabled={enabled}
              ref={doubleTapRef}
              numberOfTaps={2}
              maxDelayMs={140}
              maxDeltaX={16}
              maxDeltaY={16}
              simultaneousHandlers={[
                pinchRef,
                panRef,
                ...outerGestureHandlerRefs,
              ]}
              onGestureEvent={onDoubleTapEvent}
            >
              <Animated.View style={animatedStyles}>
                <AnimatedImageComponent
                  onLoad={onLoadImageSuccess}
                  source={imageSource}
                  style={{
                    width: targetWidth,
                    height: targetHeight,
                  }}
                />
              </Animated.View>
            </TapGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
      </Animated.View>
    );
  },
);
