#!/usr/bin/env ruby

require 'flickraw'
require 'aws-sdk-rekognition'
require 'open-uri'
require 'json'

photoset_id = ARGV[0]

FlickRaw.api_key = ENV['FLICKR_API_KEY']
FlickRaw.shared_secret = ENV['FLICKR_SHARED_SECRET']
flickr = FlickRaw::Flickr.new

rekognition = Aws::Rekognition::Client.new(
  region: 'eu-west-1',
  profile: 'perso',
)

page = 1
imported = 0
loop do
  puts "I: Getting photos from page #{page}"
  set = flickr.photosets.getPhotos(photoset_id: photoset_id, page: page)
  break if set.photo.length == 0
  set.photo.each do |pic|
    url = "http://farm#{pic['farm']}.staticflickr.com/#{pic['server']}/#{pic['id']}_#{pic['secret']}_b.jpg"
    ref = "flickr:#{pic['farm']}:#{pic['server']}:#{pic['id']}:#{pic['secret']}"

    img = open(url)

    puts "Importing #{ref} (#{url}) into collection"

    rekognition.index_faces({
        collection_id: 'flickr',
        image: { bytes: img.read },
        external_image_id: ref,
    })
  end

  page += 1
  imported += set.photo.length
end

puts "imported #{set.photo.length} photos"
