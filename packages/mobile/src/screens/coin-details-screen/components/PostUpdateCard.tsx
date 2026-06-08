import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import {
  useFanClub,
  useCurrentUserId,
  usePostTextUpdate
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import {
  parseVideoUrl,
  getVideoThumbnailUrl,
  isValidVideoUrl
} from '@audius/common/utils'
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  Button,
  Flex,
  IconClose,
  IconPlay,
  IconValidationCheck,
  Paper,
  PlainButton,
  Text,
  TextInput
} from '@audius/harmony-native'
import { ComposerInput } from 'app/components/composer-input'
import { Switch } from 'app/components/core'

const messages = {
  postUpdate: 'Post Update',
  placeholder: 'Update your fans',
  membersOnly: 'Members Only',
  attachVideo: '+ Attach Video',
  attachVideoTitle: 'ATTACH VIDEO',
  attachVideoDescription: 'Add a YouTube or Vimeo link to attach it.',
  videoUrlLabel: 'Video URL',
  attachVideoHint: 'Tip: Unlisted videos work best for exclusive content.',
  cancel: 'Cancel',
  attach: 'Attach'
}

type PostUpdateCardProps = {
  mint: string
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000'
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16
  },
  sheetDivider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: '#e6e8ec'
  },
  drawerScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16
  }
})

export const PostUpdateCard = ({ mint }: PostUpdateCardProps) => {
  const [messageId, setMessageId] = useState(0)
  const [isMembersOnly, setIsMembersOnly] = useState(true)
  const [videoUrl, setVideoUrl] = useState<string | undefined>()
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [attachUrl, setAttachUrl] = useState('')
  const { data: currentUserId } = useCurrentUserId()
  const { data: coin } = useFanClub(mint)
  const { mutate: postTextUpdate } = usePostTextUpdate()
  const { isEnabled: isTextPostPostingEnabled } = useFeatureFlag(
    FeatureFlags.FAN_CLUB_TEXT_POST_POSTING
  )

  const isOwner = currentUserId != null && coin?.ownerId === currentUserId

  const parsedVideo = videoUrl ? parseVideoUrl(videoUrl) : null
  const thumbnailUrl = parsedVideo ? getVideoThumbnailUrl(parsedVideo) : null

  const parsedAttachUrl = attachUrl.trim()
    ? parseVideoUrl(attachUrl.trim())
    : null
  const isAttachUrlValid = isValidVideoUrl(attachUrl.trim())

  const handleSubmit = useCallback(
    (value: string) => {
      if (!value.trim() || !currentUserId || !coin?.ownerId) return

      postTextUpdate({
        userId: currentUserId,
        entityId: coin.ownerId,
        body: value.trim(),
        mint,
        isMembersOnly,
        videoUrl
      })
      setMessageId((prev) => prev + 1)
      setVideoUrl(undefined)
    },
    [
      currentUserId,
      coin?.ownerId,
      mint,
      postTextUpdate,
      isMembersOnly,
      videoUrl
    ]
  )

  const { height: windowHeight } = useWindowDimensions()
  const { bottom: safeBottom } = useSafeAreaInsets()
  const backdropAnim = useRef(new Animated.Value(0)).current
  const sheetTranslateY = useRef(new Animated.Value(0)).current

  const backdropOpacity = backdropAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5]
  })

  const dismissAttachModal = useCallback(() => {
    Keyboard.dismiss()
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(sheetTranslateY, {
        toValue: windowHeight,
        duration: 220,
        useNativeDriver: true
      })
    ]).start(({ finished }) => {
      if (finished) {
        setAttachUrl('')
        setShowAttachModal(false)
      }
    })
  }, [backdropAnim, sheetTranslateY, windowHeight])

  useLayoutEffect(() => {
    if (!showAttachModal) return

    backdropAnim.setValue(0)
    sheetTranslateY.setValue(windowHeight)

    const openAnim = Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        friction: 9,
        tension: 65,
        useNativeDriver: true
      })
    ])

    openAnim.start()
    return () => {
      openAnim.stop()
    }
  }, [showAttachModal, windowHeight, backdropAnim, sheetTranslateY])

  const handleAttach = useCallback(() => {
    if (!isAttachUrlValid) return
    setVideoUrl(attachUrl.trim())
    setAttachUrl('')
    dismissAttachModal()
  }, [isAttachUrlValid, attachUrl, dismissAttachModal])

  const handleCloseModal = useCallback(() => {
    dismissAttachModal()
  }, [dismissAttachModal])

  if (!isOwner || !isTextPostPostingEnabled) return null

  return (
    <Paper
      column
      ph='xl'
      pv='xl'
      border='strong'
      borderRadius='l'
      shadow='mid'
      style={{ overflow: 'hidden' }}
    >
      <Flex column gap='l'>
        <Text variant='heading' size='s'>
          {messages.postUpdate}
        </Text>

        <ComposerInput
          messageId={messageId}
          placeholder={messages.placeholder}
          onSubmit={(value) => handleSubmit(value)}
          maxLength={2000}
        />

        <Flex row alignItems='center' justifyContent='space-between'>
          <Flex row alignItems='center' gap='m'>
            {videoUrl && parsedVideo ? (
              <View style={{ position: 'relative', width: 102, height: 56 }}>
                <View
                  style={{
                    width: 102,
                    height: 56,
                    borderRadius: 4,
                    overflow: 'hidden',
                    backgroundColor: '#1a1a2e'
                  }}
                >
                  {thumbnailUrl ? (
                    <Image
                      source={{ uri: thumbnailUrl }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode='cover'
                    />
                  ) : null}
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <IconPlay size='l' color='staticWhite' />
                  </View>
                </View>
                <Pressable
                  onPress={() => setVideoUrl(undefined)}
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: 4,
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <IconClose size='xs' color='staticWhite' />
                </Pressable>
              </View>
            ) : (
              <PlainButton
                variant='default'
                onPress={() => setShowAttachModal(true)}
              >
                {messages.attachVideo}
              </PlainButton>
            )}
          </Flex>
          <Flex row alignItems='center' gap='s'>
            <Text variant='label' size='s'>
              {messages.membersOnly}
            </Text>
            <Switch value={isMembersOnly} onValueChange={setIsMembersOnly} />
          </Flex>
        </Flex>
      </Flex>

      <Modal
        visible={showAttachModal}
        transparent
        animationType='none'
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalRoot}>
          <Animated.View
            pointerEvents='box-none'
            style={[styles.backdrop, { opacity: backdropOpacity }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleCloseModal}
            />
          </Animated.View>

          <KeyboardAvoidingView
            pointerEvents='box-none'
            style={styles.keyboardAvoiding}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <Animated.View
              style={[
                styles.sheet,
                {
                  transform: [{ translateY: sheetTranslateY }],
                  maxHeight: windowHeight * 0.92,
                  paddingBottom: safeBottom
                }
              ]}
            >
              <ScrollView
                contentContainerStyle={styles.drawerScrollContent}
                keyboardShouldPersistTaps='handled'
                keyboardDismissMode={
                  Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                }
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <Flex column>
                  <Flex pv='l' alignItems='center'>
                    <Text
                      variant='label'
                      size='xl'
                      strength='strong'
                      textAlign='center'
                    >
                      {messages.attachVideoTitle}
                    </Text>
                  </Flex>
                  <View style={styles.sheetDivider} />

                  <Flex pv='l' column gap='l'>
                    <Text variant='body' size='l'>
                      {messages.attachVideoDescription}
                    </Text>
                    <Flex row gap='m' alignItems='center'>
                      <Flex flex={1}>
                        <TextInput
                          label={messages.videoUrlLabel}
                          value={attachUrl}
                          onChangeText={setAttachUrl}
                          autoCapitalize='none'
                          autoCorrect={false}
                          returnKeyType='done'
                          onSubmitEditing={
                            isAttachUrlValid ? handleAttach : undefined
                          }
                        />
                      </Flex>
                      {parsedAttachUrl ? (
                        <Flex alignItems='center' justifyContent='center'>
                          <IconValidationCheck size='l' color='default' />
                        </Flex>
                      ) : null}
                    </Flex>
                    <Paper
                      backgroundColor='surface2'
                      shadow='flat'
                      border='strong'
                      ph='l'
                      pv='m'
                    >
                      <Text variant='body'>{messages.attachVideoHint}</Text>
                    </Paper>
                  </Flex>

                  <Flex pb='l' pt='s' column gap='m'>
                    <Button
                      variant='primary'
                      fullWidth
                      accessibilityState={{ disabled: !isAttachUrlValid }}
                      style={isAttachUrlValid ? undefined : { opacity: 0.45 }}
                      onPress={handleAttach}
                    >
                      {messages.attach}
                    </Button>
                    <Button
                      variant='secondary'
                      onPress={handleCloseModal}
                      fullWidth
                    >
                      {messages.cancel}
                    </Button>
                  </Flex>
                </Flex>
              </ScrollView>
            </Animated.View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Paper>
  )
}
