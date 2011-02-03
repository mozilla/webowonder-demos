# XML2JSON
# This script looks for .dae files (collada models in the current dir) and converts them to json.

# This ruby script requires 2 libs:
#   gem install cobravsmongoose
#   gem install json

# Usage:
#   ruby xml2json.rb

# json files are placed in json/ dir.

# Author: Corban Brook 


require "rubygems"
require 'cobravsmongoose'
require 'json'

Dir.entries(".").select { |entry| entry =~ /dae/ }.each do |filename|;
  xml = CobraVsMongoose.xml_to_hash(File.read(filename))
  json = xml.to_json
  json = json.gsub(/,"@xmlns":\{[^\}]+\}/, '');
  File.open("json/" + filename + ".json", "w") do |file|
    file.syswrite(json);
  end
  puts filename + " done."
end
