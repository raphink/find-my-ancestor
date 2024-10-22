#!/usr/bin/env ruby

require 'redd'
require 'aws-sdk-rekognition'
require 'open-uri'
require 'json'


session = Redd.it(
  user_agent: 'Redd:FindMyAncestor:v1.0.0 (by /u/Mustermind)',
  client_id:  ENV['REDDIT_CLIENT_ID'],
  secret:     ENV['REDDIT_SECRET'],
  username:   ENV['REDDIT_LOGIN'],
  password:   ENV['REDDIT_PASSWORD'],
)

rekognition = Aws::Rekognition::Client.new(
  region: 'eu-west-1',
  profile: 'perso',
)

subreddit = ARGV[0] || 'TheWayWeWere'
imported = 0

last_known = "progress/reddit_#{subreddit}.last_known"

after = File.read(last_known).chomp || nil


loop do
  puts "Getting listing after #{after}"
  listing = session.subreddit(subreddit).listing(:new, after: after)
  listing.each_with_index do |l, i|
    puts l
    url = l.url
    uri = URI.parse(url)
    id = l.id
    img = uri.path.sub(%r{^/}, '')
    ref = "reddit:#{subreddit}:#{id}:#{img}"

    begin
      img = URI.open(url)
      puts "[#{imported+i+1}] Importing #{ref} (#{url}) into collection"
      rekognition.index_faces({
        collection_id: 'flickr',
        image: { bytes: img.read },
        external_image_id: ref,
      })
      after = l.name
      File.open(last_known, 'w') { |f| f.puts after }
    rescue => e
      puts "W: failed to import #{ref} (#{url}): #{e}"
    end
  end

  puts "done with listing: #{listing}"

  imported += listing.to_a.length
end

puts "imported #{imported} photos"
