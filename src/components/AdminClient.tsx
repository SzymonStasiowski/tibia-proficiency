'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks'
import { generateCreatorToken, channelNameToSlug } from '@/lib/utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
// Local Toast component is deprecated in favor of Sonner toaster
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/select'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface CreatorFormData {
  channel_name: string
  avatar_url: string
  channel_url: string
  platform: 'twitch' | 'youtube' | 'kick'
}

export default function AdminClient() {
  const router = useRouter()
  const { error: showError, success } = useToast()
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState<CreatorFormData>({
    channel_name: '',
    avatar_url: '',
    channel_url: '',
    platform: 'twitch'
  })

  // Fetch existing creators
  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['admin-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    }
  })

  // Create creator mutation
  const createCreatorMutation = useMutation({
    mutationFn: async (creatorData: CreatorFormData) => {
      const creatorToken = generateCreatorToken()
      const creatorSlug = channelNameToSlug(creatorData.channel_name)
      
      // Check if slug already exists
      const { data: existingCreators } = await supabase
        .from('creators')
        .select('creator_slug')
        .eq('creator_slug', creatorSlug)
      
      if (existingCreators && existingCreators.length > 0) {
        throw new Error(`Creator slug "${creatorSlug}" already exists. Please use a different channel name.`)
      }

      const { data, error } = await supabase
        .from('creators')
        .insert({
          creator_token: creatorToken,
          creator_slug: creatorSlug,
          channel_name: creatorData.channel_name,
          avatar_url: creatorData.avatar_url || null,
          channel_url: creatorData.channel_url || null,
          platform: creatorData.platform,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error
      return { ...data, creator_token: creatorToken }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] })
      success(`Creator "${data.channel_name}" created successfully!`)
      
      // Reset form
      setFormData({
        channel_name: '',
        avatar_url: '',
        channel_url: '',
        platform: 'twitch'
      })
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      showError(`Failed to create creator: ${message}`)
    }
  })

  // Toggle creator active status
  const toggleCreatorMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { data, error } = await supabase
        .from('creators')
        .update({ is_active: !is_active })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] })
      success(`Creator ${data.is_active ? 'activated' : 'deactivated'} successfully!`)
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      showError(`Failed to update creator: ${message}`)
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.channel_name.trim()) {
      showError('Channel name is required')
      return
    }

    createCreatorMutation.mutate(formData)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    success('Copied to clipboard!')
  }

  const getCreatorVotingUrl = (token: string) => {
    return `${window.location.origin}/creator/${token}`
  }

  const getCreatorProfileUrl = (slug: string) => {
    return `${window.location.origin}/${slug}`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🔧 Creator Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Create and manage content creator accounts
              </p>
            </div>
            <Button variant="secondary" onClick={() => router.push('/')}>← Back to Site</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Creator Form */}
          <Card>
            <CardHeader>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Creator</h2>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="channel_name">Channel Name *</Label>
                  <Input
                    id="channel_name"
                    type="text"
                    name="channel_name"
                    value={formData.channel_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Shroud Gaming, Summit1G"
                    required
                  />
                  {formData.channel_name && (
                    <p className="text-xs text-gray-500 mt-1">
                      Profile URL: /{channelNameToSlug(formData.channel_name)}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="avatar_url">Avatar URL</Label>
                  <Input
                    id="avatar_url"
                    type="url"
                    name="avatar_url"
                    value={formData.avatar_url}
                    onChange={handleInputChange}
                    placeholder="https://example.com/avatar.jpg"
                  />
                </div>

                <div>
                  <Label htmlFor="channel_url">Channel URL</Label>
                  <Input
                    id="channel_url"
                    type="url"
                    name="channel_url"
                    value={formData.channel_url}
                    onChange={handleInputChange}
                    placeholder="https://twitch.tv/username"
                  />
                </div>

                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <NativeSelect
                    id="platform"
                    name="platform"
                    value={formData.platform}
                    onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLSelectElement>)}
                  >
                    <option value="twitch">Twitch</option>
                    <option value="youtube">YouTube</option>
                    <option value="kick">Kick</option>
                  </NativeSelect>
                </div>

                <Button type="submit" disabled={createCreatorMutation.isPending} className="w-full">
                  {createCreatorMutation.isPending ? 'Creating...' : 'Create Creator'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Existing Creators List */}
          <Card>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Existing Creators ({creators.length})
            </h2>

            {creatorsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading creators...</p>
              </div>
            ) : creators.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No creators created yet.</p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {creators.map((creator) => (
                  <div
                    key={creator.id}
                    className={`p-4 border rounded-lg ${
                      creator.is_active 
                        ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20' 
                        : 'border-red-200 bg-red-50 dark:border-red-700 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        {creator.avatar_url && (
                          <Image
                            src={creator.avatar_url}
                            alt={creator.channel_name}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full"
                            unoptimized
                          />
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {creator.channel_name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {creator.platform} • /{creator.creator_slug}
                          </p>
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        className={creator.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}
                        onClick={() => toggleCreatorMutation.mutate({ id: creator.id, is_active: creator.is_active })}
                      >
                        {creator.is_active ? 'Active' : 'Inactive'}
                      </Button>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Voting URL:</p>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded flex-1 truncate">
                            {getCreatorVotingUrl(creator.creator_token)}
                          </code>
                          <Button size="sm" onClick={() => copyToClipboard(getCreatorVotingUrl(creator.creator_token))}>Copy</Button>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Public Profile:</p>
                        <div className="flex items-center space-x-2">
                          <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded flex-1 truncate">
                            {getCreatorProfileUrl(creator.creator_slug)}
                          </code>
                          <Button size="sm" variant="secondary" onClick={() => copyToClipboard(getCreatorProfileUrl(creator.creator_slug))}>Copy</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
            📋 How to Use
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-blue-700 dark:text-blue-300">
            <li>Fill out the creator form with their channel information</li>
            <li>Click &quot;Create Creator&quot; to generate their unique voting token</li>
            <li>Copy the &quot;Voting URL&quot; and send it privately to the creator</li>
            <li>The creator uses this private URL to submit their votes</li>
            <li>Share the &quot;Public Profile&quot; URL for fans to see their recommendations</li>
            <li>Toggle creators active/inactive to control access</li>
          </ol>
        </div>
      </div>
      
      {/* Toasts handled globally by <AppToaster /> in layout */}
    </div>
  )
}