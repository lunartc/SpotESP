#ifndef LGFX_CONFIG_H
#define LGFX_CONFIG_H

#define LGFX_USE_V1
#include <LovyanGFX.hpp>

// This class defines the "Hardware" setup
class LGFX : public lgfx::LGFX_Device {
  lgfx::Panel_ILI9488     _panel_instance;
  lgfx::Bus_SPI           _bus_instance;

public:
  LGFX(void) {
    { // --- SPI Bus Configuration ---
      auto cfg = _bus_instance.config();
      cfg.spi_host = SPI2_HOST;     // Use FSPI (Standard for S3)
      cfg.spi_mode = 0;             
      cfg.freq_write = 40000000;    // 40MHz speed
      cfg.pin_sclk = 12;            // FSPICLK from your diagram
      cfg.pin_mosi = 11;            // FSPID from your diagram
      cfg.pin_miso = 13;            // FSPIQ from your diagram
      cfg.pin_dc   = 2;             // Data/Command (GPIO 2)
      _bus_instance.config(cfg);    
      _panel_instance.setBus(&_bus_instance);
    }

    { // --- Screen Panel Configuration ---
      auto cfg = _panel_instance.config();
      cfg.pin_cs           = 10;    // FSPICS0 from your diagram
      cfg.pin_rst          = 4;     // Reset (GPIO 4)
      cfg.panel_width      = 320;   // ILI9488 is 320 pixels wide
      cfg.panel_height     = 480;   // ILI9488 is 480 pixels tall
      cfg.bus_shared       = true;  // Set to true if sharing SPI with SD card
      _panel_instance.config(cfg);
    }
    setPanel(&_panel_instance);
  }
};

#endif