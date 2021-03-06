import React from 'react';
import PropTypes from 'prop-types';
import {
  Dimensions,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  ViewPropTypes,
  I18nManager,
} from 'react-native';
import Animated,{Easing} from "react-native-reanimated"

const STATES = {
  HIDDEN: 'HIDDEN',
  ANIMATING: 'ANIMATING',
  SHOWN: 'SHOWN',
};

const EASING =  Easing.bezier(0.4, 0, 0.2, 1);
const SCREEN_INDENT = 8;

class Menu extends React.Component {
  _container = null;

  state = {
    menuState: STATES.HIDDEN,

    top: 0,
    left: 0,

    menuWidth: 0,
    menuHeight: 0,

    buttonWidth: 0,
    buttonHeight: 0,
    menuSizeXAnimation: new Animated.Value(0),
    menuSizeYAnimation: new Animated.Value(0),
    opacityAnimation: new Animated.Value(0),
  };

  _setContainerRef = ref => {
    this._container = ref;
  };

  // Start menu animation
  _onMenuLayout = e => {
    if (this.state.menuState === STATES.ANIMATING) {
      return;
    }

    const { width, height } = e.nativeEvent.layout;

    this.setState(
      {
        menuState: STATES.ANIMATING,
        menuWidth: width,
        menuHeight: height,
      },
      () => {
          Animated.timing(this.state.menuSizeXAnimation, {
            toValue: width,
            duration: this.props.animationDuration - 25,
            easing: EASING,
          }).start()
          Animated.timing(this.state.menuSizeYAnimation, {
            toValue: height,
            duration: this.props.animationDuration - 25,
            easing: EASING,
          }).start()
          Animated.timing(this.state.opacityAnimation, {
            toValue: 1,
            duration: this.props.animationDuration + 25,
            easing: EASING,
          }).start()
      },
    );
  };

  _onDismiss = () => {
    if (this.props.onHidden) {
      this.props.onHidden();
    }
  };

  show = () => {
    this._container.measureInWindow((left, top, buttonWidth, buttonHeight) => {
      this.setState({
        buttonHeight,
        buttonWidth,
        left,
        menuState: STATES.SHOWN,
        top,
      });
    });
  };

  hide = onHidden => {
    Animated.timing(this.state.opacityAnimation, {
      toValue: 0,
      duration: this.props.animationDuration,
      easing: EASING,
    }).start(() => {
      // Reset state
      this.setState(
        {
          menuState: STATES.HIDDEN,
          menuSizeXAnimation: new Animated.Value(0),
          menuSizeYAnimation: new Animated.Value(0),
          opacityAnimation: new Animated.Value(0),
        },
        () => {
          if (onHidden) {
            onHidden();
          }

          // Invoke onHidden callback if defined
          if (Platform.OS !== 'ios' && this.props.onHidden) {
            this.props.onHidden();
          }
        },
      );
    });
  };

  // @@ TODO: Rework this
  _hide = () => {
    this.hide();
  };

  render() {
    const { isRTL } = I18nManager;

    const dimensions = Dimensions.get('window');
    const { width: windowWidth } = dimensions;
    const windowHeight = dimensions.height - (StatusBar.currentHeight || 0);

    const {
      menuSizeXAnimation,
      menuSizeYAnimation,
      menuWidth,
      menuHeight,
      buttonWidth,
      buttonHeight,
      opacityAnimation,
    } = this.state;
    const menuSize = {
      width: menuSizeXAnimation,
      height: menuSizeYAnimation,
    };

    // Adjust position of menu
    let { left, top } = this.state;
    const transforms = [];

    if (
      (isRTL && left + buttonWidth - menuWidth > SCREEN_INDENT) ||
      (!isRTL && left + menuWidth > windowWidth - SCREEN_INDENT)
    ) {
      transforms.push({
        translateX: Animated.multiply(menuSizeXAnimation, -1),
      });

      left = Math.min(windowWidth - SCREEN_INDENT, left + buttonWidth);
    } else if (left < SCREEN_INDENT) {
      left = SCREEN_INDENT;
    }

    // Flip by Y axis if menu hits bottom screen border
    if (top > windowHeight - menuHeight - SCREEN_INDENT) {
      transforms.push({
        translateY: Animated.multiply(menuSizeYAnimation, -1),
      });

      top = windowHeight - SCREEN_INDENT;
      top = Math.min(windowHeight - SCREEN_INDENT, top + buttonHeight);
    } else if (top < SCREEN_INDENT) {
      top = SCREEN_INDENT;
    }

    const shadowMenuContainerStyle = {
      opacity: opacityAnimation,
      transform: transforms,
      top,

      // Switch left to right for rtl devices
      ...(isRTL ? { right: left } : { left }),
    };

    const { menuState } = this.state;
    const animationStarted = menuState === STATES.ANIMATING;
    const modalVisible = menuState === STATES.SHOWN || animationStarted;

    const { testID, button, style, children } = this.props;

    return (
      <View ref={this._setContainerRef} collapsable={false} testID={testID}>
        <View>{button}</View>

        <Modal
          visible={modalVisible}
          onRequestClose={this._hide}
          supportedOrientations={[
            'portrait',
            'portrait-upside-down',
            'landscape',
            'landscape-left',
            'landscape-right',
          ]}
          transparent
          onDismiss={this._onDismiss}
        >
          <TouchableWithoutFeedback onPress={this._hide} accessible={false}>
            <View style={StyleSheet.absoluteFill}>
              <Animated.View
                onLayout={this._onMenuLayout}
                style={[
                  styles.shadowMenuContainer,
                  shadowMenuContainerStyle,
                  style,
                ]}
              >
                <Animated.View
                  style={[styles.menuContainer, animationStarted && menuSize]}
                >
                  {children}
                </Animated.View>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    );
  }
}

Menu.propTypes = {
  animationDuration: PropTypes.number,
  button: PropTypes.node.isRequired,
  children: PropTypes.node.isRequired,
  onHidden: PropTypes.func,
  style: ViewPropTypes.style,
  testID: ViewPropTypes.testID,
};

Menu.defaultProps = {
  animationDuration: 300,
};

const styles = StyleSheet.create({
  shadowMenuContainer: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 4,
    opacity: 0,
    overflow:"hidden",

    // Shadow
    ...Platform.select({
      ios: {
        shadowColor: 'black',
        shadowOffset: {width: 0.3 * 5, height: 0.5 * 5},
        shadowOpacity: 0.2,
        shadowRadius: 0.7 * 5,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  menuContainer: {
    overflow: 'hidden',
  },
});

export default Menu;
