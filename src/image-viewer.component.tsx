import * as React from "react";
import {
  Animated,
  CameraRoll,
  Dimensions,
  I18nManager,
  Image,
  PanResponder,
  Platform,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle
} from "react-native";
import ImageZoom from "react-native-image-pan-zoom";
import styles from "./image-viewer.style";
import { IImageInfo, IImageSize, Props, State } from "./image-viewer.type";

export default class ImageViewer extends React.Component<Props, State> {
  public static defaultProps = new Props();
  public state = new State();

  // 背景透明度渐变动画
  private fadeAnim = new Animated.Value(0);

  // 当前基准位置
  private standardPositionX = 0;

  // 整体位移，用来切换图片用
  private positionXNumber = 0;
  private positionX = new Animated.Value(0);

  private width = 0;
  private height = 0;

  private styles = styles(0, 0, "transparent");

  // 是否执行过 layout. fix 安卓不断触发 onLayout 的 bug
  private hasLayout = false;

  private handleLongPressWithIndex = new Map<number, any>();

  public componentWillMount() {
    this.init(this.props);
  }

  public componentWillReceiveProps(nextProps: Props) {
    if (nextProps.index !== this.state.currentShowIndex) {
      this.setState(
        {
          currentShowIndex: nextProps.index
        },
        () => {
          this.jumpToCurrentImage();

          // 显示动画
          Animated.timing(this.fadeAnim, {
            toValue: 1,
            duration: 200
          }).start();
        }
      );
    }
  }

  /**
   * props 有变化时执行
   */
  public init(nextProps: Props) {
    if (nextProps.imageUrls.length === 0) {
      // 隐藏时候清空
      this.fadeAnim.setValue(0);
      return this.setState(new State());
    }

    this.setState(
      {
        currentShowIndex: nextProps.index
      },
      () => {
        this.jumpToCurrentImage();

        // 显示动画
        Animated.timing(this.fadeAnim, {
          toValue: 1,
          duration: 200
        }).start();
      }
    );
  }

  /**
   * 调到当前看图位置
   */
  public jumpToCurrentImage() {
    // 跳到当前图的位置
    this.positionXNumber = -this.width * (this.state.currentShowIndex || 0);
    this.standardPositionX = this.positionXNumber;
    this.positionX.setValue(this.positionXNumber);
  }

  /**
   * 触发溢出水平滚动
   */
  public handleHorizontalOuterRangeOffset = (offsetX: number) => {
    
  };

  /**
   * 手势结束，但是没有取消浏览大图
   */
  public handleResponderRelease = (vx: number) => {
    const vxRTL = I18nManager.isRTL ? -vx : vx;
    const isLeftMove = I18nManager.isRTL
      ? this.positionXNumber - this.standardPositionX <
        -(this.props.flipThreshold || 0)
      : this.positionXNumber - this.standardPositionX >
        (this.props.flipThreshold || 0);
    const isRightMove = I18nManager.isRTL
      ? this.positionXNumber - this.standardPositionX >
        (this.props.flipThreshold || 0)
      : this.positionXNumber - this.standardPositionX <
        -(this.props.flipThreshold || 0);

    if (vxRTL > 0.7) {
      // 上一张
      this.goBack.call(this);
      return;
    } else if (vxRTL < -0.7) {
      // 下一张
      this.goNext.call(this);
      return;
    }

    if (isLeftMove) {
      // 上一张
      this.goBack.call(this);
    } else if (isRightMove) {
      // 下一张
      this.goNext.call(this);
      return;
    } else {
      // 回到之前的位置
      this.resetPosition.call(this);
      return;
    }
  };

  /**
   * 到上一张
   */
  public goBack = () => {
    if (this.state.currentShowIndex === 0) {
      // 回到之前的位置
      this.resetPosition.call(this);
      return;
    }

    this.positionXNumber = !I18nManager.isRTL
      ? this.standardPositionX + this.width
      : this.standardPositionX - this.width;
    this.standardPositionX = this.positionXNumber;
    Animated.timing(this.positionX, {
      toValue: this.positionXNumber,
      duration: 100
    }).start();

    const nextIndex = (this.state.currentShowIndex || 0) - 1;

    this.setState(
      {
        currentShowIndex: nextIndex
      },
      () => {
        if (this.props.onChange) {
          this.props.onChange(this.state.currentShowIndex);
        }
      }
    );
  };

  /**
   * 到下一张
   */
  public goNext() {
    if (this.state.currentShowIndex === this.props.imageUrls.length - 1) {
      // 回到之前的位置
      this.resetPosition.call(this);
      return;
    }

    this.positionXNumber = !I18nManager.isRTL
      ? this.standardPositionX - this.width
      : this.standardPositionX + this.width;
    this.standardPositionX = this.positionXNumber;
    Animated.timing(this.positionX, {
      toValue: this.positionXNumber,
      duration: 100
    }).start();

    const nextIndex = (this.state.currentShowIndex || 0) + 1;

    this.setState(
      {
        currentShowIndex: nextIndex
      },
      () => {
        if (this.props.onChange) {
          this.props.onChange(this.state.currentShowIndex);
        }
      }
    );
  }

  /**
   * 回到原位
   */
  public resetPosition() {
    this.positionXNumber = this.standardPositionX;
    Animated.timing(this.positionX, {
      toValue: this.standardPositionX,
      duration: 150
    }).start();
  }

  /**
   * 长按
   */
  public handleLongPress = (image: IImageInfo) => {
    if (this.props.saveToLocalByLongPress) {
      // 出现保存到本地的操作框
      this.setState({ isShowMenu: true });
    }

    if (this.props.onLongPress) {
      this.props.onLongPress(image);
    }
  };

  /**
   * 单击
   */
  public handleClick = () => {
    if (this.props.onClick) {
      this.props.onClick(this.handleCancel);
    }
  };

  /**
   * 双击
   */
  public handleDoubleClick = () => {
    if (this.props.onDoubleClick) {
      this.props.onDoubleClick(this.handleCancel);
    }
  };

  /**
   * 退出
   */
  public handleCancel = () => {
    this.hasLayout = false;
    if (this.props.onCancel) {
      this.props.onCancel();
    }
  };

  /**
   * 完成布局
   */
  public handleLayout = (event: any) => {
    if (event.nativeEvent.layout.width !== this.width) {
      this.hasLayout = true;

      this.width = event.nativeEvent.layout.width;
      this.height = event.nativeEvent.layout.height;
      this.styles = styles(
        this.width,
        this.height,
        this.props.backgroundColor || "transparent"
      );

      // 强制刷新
      this.forceUpdate();
      this.jumpToCurrentImage();
    }
  };

  /**
   * 获得整体内容
   */
  public getContent() {
    // 获得屏幕宽高
    const screenWidth = this.width;
    const screenHeight = this.height;

    const ImageElements = this.props.imageUrls.map((image, index) => {
      if (
        (this.state.currentShowIndex || 0) > index + 1 ||
        (this.state.currentShowIndex || 0) < index - 1
      ) {
        return (
          <View
            key={index}
            style={{ width: screenWidth, height: screenHeight }}
          />
        );
      }

      if (!this.handleLongPressWithIndex.has(index)) {
        this.handleLongPressWithIndex.set(
          index,
          this.handleLongPress.bind(this, image)
        );
      }


      const Wrapper = ({ children, ...others }: any) => (
        <ImageZoom
          cropWidth={this.width}
          cropHeight={this.height}
          maxOverflow={this.props.maxOverflow}
          horizontalOuterRangeOffset={this.handleHorizontalOuterRangeOffset}
          responderRelease={this.handleResponderRelease}
          onLongPress={this.handleLongPressWithIndex.get(index)}
          onClick={this.handleClick}
          onDoubleClick={this.handleDoubleClick}
          enableSwipeDown={true}
          onSwipeDown={this.handleSwipeDown}
          {...others}
        >
          {children}
        </ImageZoom>
      );

      if (!image.props) {
        image.props = {};
      }

      if (!image.props.style) {
        image.props.style = {};
      }
      image.props.style = {
        ...this.styles.imageStyle, // User config can override above.
        ...image.props.style
      };

      if (typeof image.props.source === "number") {
        // source = require(..), doing nothing
      } else {
        if (!image.props.source) {
          image.props.source = {};
        }
        image.props.source = {
          uri: image.url,
          ...image.props.source
        };
      }

      return (
        <ImageZoom
          key={index}
          cropWidth={this.width}
          cropHeight={this.height}
          maxOverflow={this.props.maxOverflow}
          horizontalOuterRangeOffset={this.handleHorizontalOuterRangeOffset}
          responderRelease={this.handleResponderRelease}
          onLongPress={this.handleLongPressWithIndex.get(index)}
          onClick={this.handleClick}
          onDoubleClick={this.handleDoubleClick}
          imageWidth={this.width}
          imageHeight={this.height}
          enableSwipeDown={true}
          onSwipeDown={this.handleSwipeDown}
        >
          {this!.props!.renderImage!(image.props)}
        </ImageZoom>
      );

    });

    return (
      <Animated.View style={{ zIndex: 9999 }}>
        <Animated.View
          style={{ ...this.styles.container, opacity: this.fadeAnim }}
        >
          {this!.props!.renderHeader!(this.state.currentShowIndex)}

          <View style={this.styles.arrowLeftContainer}>
            <TouchableWithoutFeedback onPress={this.goBack}>
              <View>{this!.props!.renderArrowLeft!()}</View>
            </TouchableWithoutFeedback>
          </View>

          <View style={this.styles.arrowRightContainer}>
            <TouchableWithoutFeedback onPress={this.goNext}>
              <View>{this!.props!.renderArrowRight!()}</View>
            </TouchableWithoutFeedback>
          </View>

          <Animated.View
            style={{
              ...this.styles.moveBox,
              transform: [{ translateX: this.positionX }],
              width: this.width * this.props.imageUrls.length
            }}
          >
            {ImageElements}
          </Animated.View>
          {this!.props!.renderIndicator!(
            (this.state.currentShowIndex || 0) + 1,
            this.props.imageUrls.length
          )}

          {this.props.imageUrls[this.state.currentShowIndex || 0] &&
            this.props.imageUrls[this.state.currentShowIndex || 0]
              .originSizeKb &&
            this.props.imageUrls[this.state.currentShowIndex || 0]
              .originUrl && (
              <View style={this.styles.watchOrigin}>
                <TouchableOpacity style={this.styles.watchOriginTouchable}>
                  <Text style={this.styles.watchOriginText}>查看原图(2M)</Text>
                </TouchableOpacity>
              </View>
            )}
          <View
            style={[
              { bottom: 0, position: "absolute", zIndex: 9999 },
              this.props.footerContainerStyle
            ]}
          >
            {this!.props!.renderFooter!(this.state.currentShowIndex)}
          </View>
        </Animated.View>
      </Animated.View>
    );
  }

  /**
   * 保存当前图片到本地相册
   */
  public saveToLocal = () => {
    if (!this.props.onSave) {
      CameraRoll.saveToCameraRoll(
        this.props.imageUrls[this.state.currentShowIndex || 0].url
      );
      this!.props!.onSaveToCamera!(this.state.currentShowIndex);
    } else {
      this.props.onSave(
        this.props.imageUrls[this.state.currentShowIndex || 0].url
      );
    }

    this.setState({ isShowMenu: false });
  };

  public getMenu() {
    if (!this.state.isShowMenu) {
      return null;
    }

    return (
      <View style={this.styles.menuContainer}>
        <View style={this.styles.menuShadow} />
        <View style={this.styles.menuContent}>
          <TouchableHighlight
            underlayColor="#F2F2F2"
            onPress={this.saveToLocal}
            style={this.styles.operateContainer}
          >
            <Text style={this.styles.operateText}>
              {this.props.menuContext.saveToLocal}
            </Text>
          </TouchableHighlight>
          <TouchableHighlight
            underlayColor="#F2F2F2"
            onPress={this.handleLeaveMenu}
            style={this.styles.operateContainer}
          >
            <Text style={this.styles.operateText}>
              {this.props.menuContext.cancel}
            </Text>
          </TouchableHighlight>
        </View>
      </View>
    );
  }

  public handleLeaveMenu = () => {
    this.setState({ isShowMenu: false });
  };

  public handleSwipeDown = () => {
    if (this.props.onSwipeDown) {
      this.props.onSwipeDown();
    }
    this.handleCancel();
  };

  public render() {
    let childs: React.ReactElement<any> = null as any;

    childs = (
      <View>
        {this.getContent()}
        {this.getMenu()}
      </View>
    );

    return (
      <View
        onLayout={this.handleLayout}
        style={{
          flex: 1,
          overflow: "hidden",
          ...this.props.style
        }}
      >
        {childs}
      </View>
    );
  }
}
