import { useEffect, useState } from 'react'

import { AnyAction } from '@reduxjs/toolkit'
import { useSelector, useDispatch } from 'react-redux'
import { Action } from 'redux'
import { ThunkAction, ThunkDispatch } from 'redux-thunk'

import imageBlank from 'assets/img/imageBlank2x.png'
import Audius from 'services/Audius'
import { audiusSdk } from 'services/Audius/sdk'
import AppState from 'store/types'
import { Playlist, Track } from 'types'

import {
  MusicError,
  setTopAlbums,
  setTopPlaylists,
  setTopTracks
} from './slice'

const AUDIUS_URL = import.meta.env.VITE_AUDIUS_URL

// -------------------------------- Selectors  ---------------------------------

export const getTopTracks = (state: AppState) => state.cache.music.topTracks
export const getTopPlaylists = (state: AppState) =>
  state.cache.music.topPlaylists
export const getTopAlbums = (state: AppState) => state.cache.music.topAlbums

// -------------------------------- Thunk Actions  ---------------------------------

export function fetchTopTracks(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch) => {
    try {
      const { data } = await audiusSdk.tracks.getTrendingTracks({ limit: 4 })
      const tracks: Track[] = data.map((d) => ({
        title: d.title,
        handle: d.user.handle,
        artwork: d.artwork?._480x480 ?? imageBlank,
        url: `${AUDIUS_URL}/tracks/${d.id}`,
        userUrl: `${AUDIUS_URL}/users/${d.user.id}`
      }))
      dispatch(setTopTracks({ tracks }))
    } catch (e) {
      dispatch(setTopTracks({ tracks: MusicError.ERROR }))
      console.error(e)
    }
  }
}

export function fetchTopPlaylists(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch) => {
    try {
      const limit = 5
      const { data } = await audiusSdk.full.playlists.getTrendingPlaylists({
        limit,
        omitTracks: true
      })
      const playlists: Playlist[] = data.slice(0, limit).map((d) => ({
        title: d.playlistName,
        handle: d.user.handle,
        artwork: d.artwork?._480x480 ?? imageBlank,
        plays: d.totalPlayCount,
        url: `${AUDIUS_URL}/playlists/${d.id}`
      }))
      dispatch(setTopPlaylists({ playlists }))
    } catch (e) {
      console.error(e)
      dispatch(setTopPlaylists({ playlists: MusicError.ERROR }))
    }
  }
}

export function fetchTopAlbums(): ThunkAction<
  void,
  AppState,
  Audius,
  Action<string>
> {
  return async (dispatch) => {
    try {
      const { data } = await audiusSdk.full.playlists.getTrendingPlaylists({
        type: 'album',
        omitTracks: true,
        limit: 5
      })

      const albums: Playlist[] = data.map((d) => ({
        title: d.playlistName,
        handle: d.user.handle,
        artwork: d.artwork?._480x480 ?? imageBlank,
        plays: d.totalPlayCount,
        url: `${AUDIUS_URL}/playlists/${d.id}`
      }))
      dispatch(setTopAlbums({ albums }))
    } catch (e) {
      console.error(e)
      dispatch(setTopAlbums({ albums: MusicError.ERROR }))
    }
  }
}

// -------------------------------- Hooks  --------------------------------

export const useTopTracks = () => {
  const [doOnce, setDoOnce] = useState(false)
  const topTracks = useSelector(getTopTracks)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffect(() => {
    if (!doOnce && !topTracks) {
      setDoOnce(true)
      dispatch(fetchTopTracks())
    }
  }, [doOnce, topTracks, dispatch])

  useEffect(() => {
    if (topTracks) {
      setDoOnce(false)
    }
  }, [topTracks, setDoOnce])

  return { topTracks }
}

export const useTopPlaylists = () => {
  const [doOnce, setDoOnce] = useState(false)
  const topPlaylists = useSelector(getTopPlaylists)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffect(() => {
    if (!doOnce && !topPlaylists) {
      setDoOnce(true)
      dispatch(fetchTopPlaylists())
    }
  }, [topPlaylists, dispatch, doOnce])

  useEffect(() => {
    if (topPlaylists) {
      setDoOnce(false)
    }
  }, [topPlaylists, setDoOnce])

  return { topPlaylists }
}

export const useTopAlbums = () => {
  const [doOnce, setDoOnce] = useState(false)
  const topAlbums = useSelector(getTopAlbums)
  const dispatch: ThunkDispatch<AppState, Audius, AnyAction> = useDispatch()

  useEffect(() => {
    if (!doOnce && !topAlbums) {
      setDoOnce(true)
      dispatch(fetchTopAlbums())
    }
  }, [topAlbums, dispatch, doOnce])

  useEffect(() => {
    if (topAlbums) {
      setDoOnce(false)
    }
  }, [topAlbums, setDoOnce])

  return { topAlbums }
}
