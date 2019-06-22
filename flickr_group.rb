#!/usr/bin/env ruby

require 'flickraw'
require 'aws-sdk-rekognition'
require 'open-uri'
require 'json'


FlickRaw.api_key = ENV['FLICKR_API_KEY']
FlickRaw.shared_secret = ENV['FLICKR_SHARED_SECRET']
flickr = FlickRaw::Flickr.new

rekognition = Aws::Rekognition::Client.new(
  region: 'eu-west-1',
  profile: 'perso',
)

group_name = ARGV[0]
group_id = flickr.urls.lookupGroup(url: "https://www.flickr.com/groups/#{group_name}/").id
last_known = "#{group_id}.last_known_page"
page = 1
page = File.read(last_known).chomp.to_i if File.file?(last_known)
imported = 0

loop do
  puts "I: Getting photos from page #{page}"
  begin
	  photos = flickr.groups.pools.getPhotos(group_id: group_id, per_page: 500, page: page)
	  break if photos.length == 0
	  File.open(last_known, 'w') { |f| f.puts page }
  rescue
	  puts "W: failed to get photos from page, retrying"
      sleep 2
	  retry
  end

  photos.each do |pic|
      url = "http://farm#{pic['farm']}.staticflickr.com/#{pic['server']}/#{pic['id']}_#{pic['secret']}_b.jpg"
      ref = "flickr:#{pic['farm']}:#{pic['server']}:#{pic['id']}:#{pic['secret']}"

      begin
      img = open(url)
      puts "Importing #{ref} (#{url}) into collection"
      rekognition.index_faces({
          collection_id: 'flickr',
          image: { bytes: img.read },
          external_image_id: ref,
      })
      rescue => e
        puts "W: failed to import #{ref} (#{url}): #{e}"
      end
  end

  page += 1
  imported += photos.length
end


puts "imported #{imported} photos"
