#include <Arduino.h>
#include "LGFX_Config.h"

LGFX tft;
#define LGFX_USE_V1

String currentTrack = "Waiting...";
String currentArtistAlbum = "Connect Spotify";


void drawHeader() {
  tft.fillRect(0, 0, tft.width(), 85, TFT_BLACK); 
  
  tft.setFont(&fonts::Font4); 
  tft.setTextSize(1);
  tft.setTextColor(TFT_WHITE);
  
  while (tft.textWidth(currentTrack) > (tft.width() - 20)) {
    tft.setFont(&fonts::Font2);
    break; 
  }
  
  tft.setCursor(7, 15);
  tft.print(currentTrack);
  
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_LIGHTGREY);
  tft.setCursor(11, 50);
  tft.print(currentArtistAlbum);
  
}

void drawLyrics(String lyric) {
  tft.fillRect(0, 90, tft.width(), tft.height() - 90, TFT_BLACK); 

  tft.setFont(&fonts::Font4);
  tft.setTextColor(TFT_WHITE);
  tft.setTextWrap(true);
  tft.setCursor(7, 110); 

  if (lyric == "\n" || lyric == "...") {
      tft.print("...");
  } else if (lyric == "_LYRICSNOTFOUND") {
      tft.print("Lyrics not found");
  } else {
      tft.print(lyric);
  }
}

void setup() {
  Serial.begin(115200);
  
  tft.init();
  tft.setRotation(3);
  tft.fillScreen(TFT_BLACK);

  tft.setFont(&fonts::Font4);
  tft.setTextSize(2);
  tft.setTextColor(0x4D6A);
  tft.drawString("SpotESP", 7, 10);
  tft.setTextSize(1);
  tft.setFont(&fonts::Font2);
  tft.setTextColor(TFT_WHITE);
  tft.drawString("Waiting on Serial Connection", 11, 55);
}

void loop() {
  if (Serial.available() > 0) {
    String incoming = Serial.readStringUntil('\n');
    
    incoming.replace("\r", "");
    incoming.replace("\xE2\x80\x99", "'"); 
    incoming.replace("\xE2\x80\x98", "'");
    incoming.trim();

    if (incoming.startsWith("##")) {
      String raw = incoming.substring(2);
      int firstPipe = raw.indexOf('|');
      int secondPipe = raw.lastIndexOf('|');

      if (firstPipe != -1 && secondPipe != -1) {
          String track = raw.substring(0, firstPipe);
          String artist = raw.substring(firstPipe + 1, secondPipe);
          String album = raw.substring(secondPipe + 1);

          track.replace("\xE2\x80\x99", "'");
          artist.replace("\xE2\x80\x99", "'");
          
          currentTrack = track;
          currentArtistAlbum = artist + " - " + album;

          drawHeader();
          drawLyrics(""); 
      }
    } 
    else if (incoming.length() > 0) {
      drawLyrics(incoming);
    }
  }
}