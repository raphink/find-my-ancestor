#!/usr/bin/env ruby

require 'flickraw'
require 'aws-sdk-rekognition'
require 'open-uri'
require 'json'

user = ARGV[0]

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
  photos = flickr.people.getPhotos(user_id: user, page: page)
  break if photos.length == 0
  photos.each do |pic|
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
  imported += photos.length
end

puts "imported #{imported} photos"
