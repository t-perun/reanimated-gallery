import React, { useState, useEffect } from 'react';
import { Dimensions, View, Text, StyleSheet, ViewStyle } from 'react-native';
import {
  GalleryItemType,
  SimpleScalableImage,
  Pager,
} from 'react-native-gallery-toolkit';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { FlatList } from 'react-native-gesture-handler';
// import { useRoute } from '@react-navigation/native';
// import { StackHeaderProps, Header } from '@react-navigation/stack';

const { height, width } = Dimensions.get('window');

// const headerPropsMap = new Map<string, StackHeaderProps>();
// const subs: Array<() => void> = [];

const images: GalleryItemType[] = [
  {
    id: '1',
    width: 300,
    height: 300,
    uri: 'https://placekitten.com/300/300',
  },
  {
    id: '2',
    width: 400,
    height: 200,
    uri: 'https://placekitten.com/400/200',
  },
];

const data = [{key:1},{key:2},{key:3},{key:4},{key:5}]

// FIXME:
// function useHeaderProps() {
//   const route = useRoute();

//   return headerPropsMap.get(route.name);
// };

// function DetachedHeader() {
//   const [,forceUpdate] = useState(false);
//   useEffect(() => {
//     const onPropsChange = () => forceUpdate(v => !v);

//     subs.push(onPropsChange);

//     return () => {
//       const index = subs.findIndex(i => i === onPropsChange);

//       subs.splice(index);
//     }
//   }, []);

//   const headerProps = useHeaderProps()


//   return headerProps ? <Header {...headerProps} /> : null;
// }

const s = StyleSheet.create({
  itemContainer: {
    height: 500,
    backgroundColor: 'white'
  },
  itemHeader: {
    height:30,
  },
  itemPager: {
    height:400
  },
  footerItem: {
    height: 70,
    zIndex: -1,
  }

})

export default function BasicCarouselScreen() {

  function keyExtractor(item, index) {
    return index.toString();
  }

  function onIndexChangeWorklet(nextIndex) {
    'worklet';
  }

  const sIndex = useSharedValue(-1)
  // const animatedBlackStyles = useAnimatedStyle(() => {
  //   return {
  //     backgroundColor:'black',
  //     position: 'absolute',
  //     top: 0,
  //     bottom: 0,
  //     right: 0,
  //     left: 0,
  //     opacity: 0.5,
  //     // zIndex: 10000,
  //     // zIndex: sIndex.value === -1 ? 0 : 10000,
  //     // flex:1,
  //     transform: [
  //       {
  //         translateX: sIndex.value === -1 ? 1000 : 0
  //       }
  //     ]
  //   }
  // })

  const renderItem = ({index: _index}: {index: number}) => (
    <Animated.View style={s.itemContainer}>
      <View style={s.itemHeader}>
        <Text>Some header info</Text>
      </View>
      <View style={s.itemPager}>
        <Pager
          pages={images}
          totalCount={images.length}
          keyExtractor={keyExtractor}
          initialIndex={0}
          width={width}
          gutterWidth={0}
          onIndexChange={onIndexChangeWorklet}
          renderPage={(
            {
              // index,
              width: _width,
              item,
              isPagerInProgress,
              isActive,
              onPageStateChange,
              pagerRefs,
            }) =>
            {
              return (
                  <SimpleScalableImage
                    outerGestureHandlerActive={isPagerInProgress}
                    isActive={isActive}
                    windowDimensions={{ width: _width, height }}
                    height={item.height}
                    onStateChange={(st)=> {
                      onPageStateChange(st)
                      if(st){
                        sIndex.value = -1
                      }
                    }}
                    outerGestureHandlerRefs={pagerRefs}
                    uri={item.uri}
                    width={item.width}
                    onDoubleTap={()=> {}}
                    onInteraction={() => {
                      sIndex.value = _index
                    }}
                    // index={index}
                    dataCount={images.length}
                  />
              )
            }
          }
        />
      </View>
      <View style={s.footerItem}>
        <Text>Some footer info</Text>
      </View>
    </Animated.View>
  )

  // function cellRendererComponent({
  //     children,
  //     index,
  //     style,
  //     ...rest
  //   }) => {
  // function cellRendererComponent(props: any) => {
  // // function cellRendererComponent({
  // //   children,
  // //   index,
  // //   style,
  // //   ...rest
  // // },
  // // : {
  // //   children: React.ReactNode,
  // //   index: number,
  // //   style: ViewStyle,
  // //   ...rest: any
  // // }) => {
  // const {
  //   children,
  //   index,
  //   style
  // } : {
  //   children: React.ReactNode,
  //   index: number,
  //   style: ViewStyle
  // } = props


  //   const animatedStyles = useAnimatedStyle(() => {
  //     if(sIndex.value !== -1 && sIndex.value === index) {
  //       return {
  //         zIndex: data.length + 1,
  //       }
  //     }
  //     return {
  //       zIndex: 0,
  //     }
  //   })
  //   // children: React.ReactNode,
  //   // index: number,
  //   // style: ViewStyle,
  //   return (
  //       <Animated.View
  //         style={[animatedStyles, ]}
  //         index={index}
  //         {...rest}
  //       >
  //         {children}
  //       </Animated.View>
  //   )
  // }

  return (
    <View style={{flex:1}}>
        {/* <DetachedHeader /> */}
        <FlatList
          data={data}
          keyExtractor={({key})=> `${key}`}
          // CellRendererComponent={cellRendererComponent}
          CellRendererComponent={({ children, index, style, ...props }) => {
            const animatedStyles = useAnimatedStyle(() => {
              if(sIndex.value !== -1 && sIndex.value === index) {
                return {
                  zIndex: data.length + 1,
                }
              }
              return {
                zIndex: 0,
              }
            })
            return (
                <Animated.View
                  style={[animatedStyles, ]}
                  index={index}
                  {...props}
                >
                  {children}
                </Animated.View>
            )
          }}
          renderItem={renderItem}
          />
    </View>
    );
}
