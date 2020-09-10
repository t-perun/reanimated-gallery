import React from 'react';
import { Dimensions, View, Text } from 'react-native';
import {
  GalleryItemType,
  SimpleScalableImage,
  Pager,
} from 'reanimated-gallery';
import { FlatList } from 'react-native-gesture-handler';

const { height, width } = Dimensions.get('window');

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

export default function BasicCarouselScreen() {

  function keyExtractor(item, index) {
    return index.toString();
  }

  function onIndexChangeWorklet(nextIndex) {
    'worklet';
  }


  return (
    <View>
        <FlatList
          data={[{key:1},{key:2},{key:3}]}
          keyExtractor={({key})=> `${key}`}
          renderItem={() =>
            <View style={{height: 500}}>
              <View style={{height:30}}>
                <Text>Some header info</Text>
              </View>
              <View style={{height:400, width}}>
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
                      index,
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
                          onStateChange={onPageStateChange}
                          outerGestureHandlerRefs={pagerRefs}
                          uri={item.uri}
                          width={item.width}
                          onDoubleTap={()=> {}}
                          onInteraction={(c) => console.log(c, 'c')}
                          index={index}
                          style={
                            {
                              alignSelf: 'center',
                              alignItems: 'center',
                              justifyContent: 'center'

                            }
                          }
                        />
                      )
                    }
                  }
                />
              </View>
              <View style={{height: 70}}>
                <Text>Some footer info</Text>
              </View>
            </View>
          }
          />
    </View>
    );
}
