/**
 * NMEA Parser Module
 * Parses NMEA sentences according to NMEA V4.1 specification
 * Supports: GNGGA, GNGST, GNGSA, GxGSV (GP/GL/GB/GA/GQ), GNRMC, GNVTG
 */

class NMEAParser {
  constructor() {
    this.sentenceTypes = {
      GGA: this.parseGGA.bind(this),
      GST: this.parseGST.bind(this),
      GSA: this.parseGSA.bind(this),
      GSV: this.parseGSV.bind(this),
      RMC: this.parseRMC.bind(this),
      VTG: this.parseVTG.bind(this)
    };

    // Signal ID definitions (NMEA 4.1) per GSV signal ID reference
    this.signalIdMap = {
      GP: {
        1: 'L1 C/A', 2: 'L1 P(Y)', 3: 'L1 M', 4: 'L2 P(Y)',
        5: 'L2C-M', 6: 'L2C-L', 7: 'L5-I', 8: 'L5-Q',
        9: 'Reserved'
      },
      GL: {
        1: 'G1 C/A', 2: 'G1 P', 3: 'G2 C/A', 4: 'G2 P'
      },
      GA: {
        1: 'E5a', 2: 'E5b', 3: 'E5 a+b', 4: 'E6-A',
        5: 'E6-BC', 6: 'L1-A', 7: 'L1-BC'
      },
      GB: {
        1: 'B1I', 2: 'B1Q', 3: 'B1C', 4: 'B1A',
        5: 'B2-a', 6: 'B2-b', 7: 'B2 a+b', 8: 'B3I',
        9: 'B3Q', 10: 'B3A', 11: 'B2I', 12: 'B2Q'
      },
      GQ: {
        1: 'L1 C/A', 2: 'L1C (D)', 3: 'L1C (P)', 4: 'LIS',
        5: 'L2C-M', 6: 'L2C-L', 7: 'L5-I', 8: 'L5-Q',
        9: 'L6D', 10: 'L6E'
      }
    };

    // System ID to constellation mapping
    this.systemIdMap = {
      1: { name: 'GPS', prefix: 'GP' },
      2: { name: 'GLONASS', prefix: 'GL' },
      3: { name: 'Galileo', prefix: 'GA' },
      4: { name: 'BDS', prefix: 'GB' },
      5: { name: 'QZSS', prefix: 'GQ' },
      6: { name: 'NavIC/IRNSS', prefix: 'GI' },
      7: { name: 'SBAS', prefix: 'GQ' }
    };

    // GSV message reassembly buffer
    this.gsvBuffer = {};
  }

  /**
   * Calculate NMEA checksum
   */
  calculateChecksum(sentence) {
    let checksum = 0;
    for (let i = 0; i < sentence.length; i++) {
      checksum ^= sentence.charCodeAt(i);
    }
    return checksum.toString(16).toUpperCase().padStart(2, '0');
  }

  /**
   * Verify NMEA checksum
   */
  verifyChecksum(sentence) {
    const trimmed = sentence.trim();
    const checksumIndex = trimmed.lastIndexOf('*');
    if (checksumIndex === -1) return false;

    const data = trimmed.substring(1, checksumIndex);
    const expectedChecksum = trimmed.substring(checksumIndex + 1).trim();
    const calculated = this.calculateChecksum(data);
    return calculated === expectedChecksum.toUpperCase();
  }

  /**
   * Parse single NMEA sentence
   */
  parse(sentence) {
    if (!sentence || typeof sentence !== 'string') return null;

    const trimmed = sentence.trim();
    if (!trimmed.startsWith('$') && !trimmed.startsWith('@')) return null;

    // Verify checksum
    if (trimmed.startsWith('$') && !this.verifyChecksum(trimmed)) {
      return null;
    }

    // Extract talker ID and sentence type
    let dataPart;
    if (trimmed.startsWith('$')) {
      dataPart = trimmed.substring(1, trimmed.lastIndexOf('*'));
    } else {
      // Handle proprietary sentences like @GELOC
      return null;
    }

    const parts = dataPart.split(',');
    if (parts.length < 2) return null;

    const talkerFull = parts[0]; // e.g., "GNGGA", "GPGSV"
    const talkerId = talkerFull.substring(0, 2); // "GN", "GP", "GL", etc.
    const sentenceType = talkerFull.substring(2); // "GGA", "GSV", etc]

    if (this.sentenceTypes[sentenceType]) {
      return this.sentenceTypes[sentenceType](parts, talkerId, trimmed);
    }

    return null;
  }

  /**
   * Parse GGA Sentence
   * $GNGGA,time,lat,N,lon,E,quality,numSats,hdop,alt,M,geoid,M,dgpsAge,dgpsStation*cs
   */
  parseGGA(parts, talkerId) {
    if (parts.length < 15) return null;

    const timestamp = this.parseTimestamp(parts[1]);
    const latitude = this.parseLatitude(parts[2], parts[3]);
    const longitude = this.parseLongitude(parts[4], parts[5]);
    const quality = parseInt(parts[6], 10);

    return {
      type: 'GGA',
      talkerId,
      timestamp,
      latitude,
      longitude,
      quality,
      qualityText: this.getQualityText(quality),
      numSatellites: parseInt(parts[7], 10) || 0,
      hdop: parseFloat(parts[8]) || 0,
      altitude: parseFloat(parts[9]) || 0,
      altitudeUnits: parts[10] || 'M',
      geoidSeparation: parseFloat(parts[11]) || 0,
      dgpsAge: parseFloat(parts[13]) || 0,
      dgpsStationId: parts[14] ? parts[14].trim() : ''
    };
  }

  /**
   * Parse GST Sentence
   * $GNGST,time,rmsErr,semiMajorErr,semiMinorErr,semiMajorOrient,latErr,lonErr,altErr*cs
   */
  parseGST(parts, talkerId) {
    if (parts.length < 8) return null;

    return {
      type: 'GST',
      talkerId,
      timestamp: this.parseTimestamp(parts[1]),
      rmsError: parseFloat(parts[2]) || 0,
      semiMajorError: parseFloat(parts[3]) || 0,
      semiMinorError: parseFloat(parts[4]) || 0,
      semiMajorOrientation: parseFloat(parts[5]) || 0,
      latitudeError: parseFloat(parts[6]) || 0,
      longitudeError: parseFloat(parts[7]) || 0,
      altitudeError: parts.length > 8 ? (parseFloat(parts[8]) || 0) : 0
    };
  }

  /**
   * Parse GSA Sentence
   * $GNGSA,mode,fixType,PRN1,...,PRN12,PDOP,HDOP,VDOP,systemID*cs
   */
  parseGSA(parts, talkerId) {
    if (parts.length < 18) return null;

    const mode = parts[1] || 'A';
    const fixType = parseInt(parts[2], 10) || 0;

    // Extract satellite PRNs (fields 3-14, indices 3 to 14 inclusive)
    const satellites = [];
    for (let i = 3; i <= 14 && i < parts.length; i++) {
      const prn = parseInt(parts[i], 10);
      if (!isNaN(prn) && prn > 0) {
        satellites.push(prn);
      }
    }

    // System ID is the last numeric field before checksum
    // Format: ...,PDOP,HDOP,VDOP,systemID*cs
    // Fields: [15]=PDOP, [16]=HDOP, [17]=VDOP, [18]=systemID
    let systemId = 0;
    if (parts.length >= 19) {
      const lastField = parts[18].split('*')[0];
      systemId = parseInt(lastField, 10) || 0;
    }

    const systemInfo = this.systemIdMap[systemId] || { name: 'Unknown', prefix: 'GN' };

    return {
      type: 'GSA',
      talkerId,
      mode,
      fixType,
      fixTypeText: this.getFixTypeText(fixType),
      satellites,
      pdop: parseFloat(parts[15]) || 0,
      hdop: parseFloat(parts[16]) || 0,
      vdop: parseFloat(parts[17]) || 0,
      systemId,
      systemName: systemInfo.name,
      systemPrefix: systemInfo.prefix
    };
  }

  /**
   * Parse GSV Sentence
   * $GxGSV,msgs,msg,numSatsInView,PRN,el,az,snr,...,signalID*cs
   * Supports NMEA 4.1 Signal ID field
   */
  parseGSV(parts, talkerId, rawSentence) {
    if (parts.length < 4) return null;

    const totalMessages = parseInt(parts[1], 10) || 1;
    const messageNumber = parseInt(parts[2], 10) || 1;
    const satellitesInView = parseInt(parts[3], 10) || 0;

    // Detect Signal ID: last field before checksum is signal ID
    // Pattern: field looks like single hex digit followed by *checksum
    let signalId = 0;
    const lastField = parts[parts.length - 1];
    const lastValue = lastField.split('*')[0];

    // Signal ID is a single hex digit (0-9, A-F) appearing before the checksum
    if (lastValue.match(/^[0-9A-Fa-f]$/) && parts.length >= 9) {
      signalId = parseInt(lastValue, 16) || 0;
    }

    // Parse satellite data (fields 4 onwards, groups of 4: PRN, elev, azim, snr)
    const satellites = [];
    const startIdx = 4;
    const endIdx = signalId > 0 ? parts.length - 1 : parts.length;

    for (let i = startIdx; i < endIdx; i += 4) {
      if (i + 3 >= endIdx) break;
      const prn = parseInt(parts[i], 10);
      if (isNaN(prn) || prn <= 0) continue;

      const elevation = parseFloat(parts[i + 1]) || 0;
      const azimuth = parseFloat(parts[i + 2]) || 0;
      const snrRaw = parts[i + 3] ? parts[i + 3].split('*')[0] : '';
      const snr = parseFloat(snrRaw) || 0;

      if (prn > 0) {
        satellites.push({
          prn,
          elevation,
          azimuth,
          snr,
          signalId,
          signalName: this.getSignalName(talkerId, signalId)
        });
      }
    }

    return {
      type: 'GSV',
      talkerId,
      constellation: this.getConstellationName(talkerId),
      messageNumber,
      totalMessages,
      satellitesInView,
      satellites,
      signalId,
      signalName: this.getSignalName(talkerId, signalId)
    };
  }

  /**
   * Parse RMC Sentence
   */
  parseRMC(parts, talkerId) {
    if (parts.length < 12) return null;

    return {
      type: 'RMC',
      talkerId,
      timestamp: this.parseTimestamp(parts[1]),
      status: parts[2] || 'V',
      latitude: this.parseLatitude(parts[3], parts[4]),
      longitude: this.parseLongitude(parts[5], parts[6]),
      speedOverGround: parseFloat(parts[7]) || 0,
      courseOverGround: parseFloat(parts[8]) || 0,
      date: parts[9] || '',
      magneticVariation: parseFloat(parts[10]) || 0,
      variationDirection: parts[11] || ''
    };
  }

  /**
   * Parse VTG Sentence
   */
  parseVTG(parts, talkerId) {
    if (parts.length < 8) return null;

    return {
      type: 'VTG',
      talkerId,
      trackTrue: parseFloat(parts[1]) || 0,
      trackMagnetic: parseFloat(parts[3]) || 0,
      speedKnots: parseFloat(parts[5]) || 0,
      speedKmh: parseFloat(parts[7]) || 0
    };
  }

  /**
   * Parse timestamp HHMMSS.ss
   */
  parseTimestamp(str) {
    if (!str || str.length < 6) return null;
    return {
      hours: parseInt(str.substring(0, 2), 10),
      minutes: parseInt(str.substring(2, 4), 10),
      seconds: parseFloat(str.substring(4)),
      toString() {
        return `${String(this.hours).padStart(2, '0')}:${String(this.minutes).padStart(2, '0')}:${this.seconds.toFixed(2).padStart(5, '0')}`;
      }
    };
  }

  /**
   * Parse latitude DDMM.MMMMMMMM N/S
   */
  parseLatitude(value, direction) {
    if (!value || !direction || value.length < 4) return null;

    const degrees = parseFloat(value.substring(0, 2));
    const minutes = parseFloat(value.substring(2));
    let decimalDegrees = degrees + minutes / 60;

    if (direction.toUpperCase() === 'S') {
      decimalDegrees = -decimalDegrees;
    }

    return {
      decimalDegrees,
      degrees,
      minutes,
      direction: direction.toUpperCase(),
      formatted: `${decimalDegrees.toFixed(8)}° ${direction}`
    };
  }

  /**
   * Parse longitude DDDMM.MMMMMMMM E/W
   */
  parseLongitude(value, direction) {
    if (!value || !direction || value.length < 5) return null;

    const degrees = parseFloat(value.substring(0, 3));
    const minutes = parseFloat(value.substring(3));
    let decimalDegrees = degrees + minutes / 60;

    if (direction.toUpperCase() === 'W') {
      decimalDegrees = -decimalDegrees;
    }

    return {
      decimalDegrees,
      degrees,
      minutes,
      direction: direction.toUpperCase(),
      formatted: `${decimalDegrees.toFixed(8)}° ${direction}`
    };
  }

  /**
   * Get quality description
   */
  getQualityText(quality) {
    const map = {
      0: 'Invalid',
      1: 'Single',
      2: 'DGNSS',
      3: 'PPS',
      4: 'RTK Fixed',
      5: 'RTK Float',
      6: 'DR',
      7: 'Manual',
      8: 'Simulated'
    };
    return map[quality] || 'Unknown('+quality+')';
  }

  /**
   * Get fix type description
   */
  getFixTypeText(fixType) {
    const map = {
      1: 'No Fix',
      2: '2D Fix',
      3: '3D Fix'
    };
    return map[fixType] || 'Unknown('+fixType+')';
  }

  /**
   * Get constellation name from talker ID
   */
  getConstellationName(talkerId) {
    const map = {
      GP: 'GPS',
      GL: 'GLONASS',
      GA: 'Galileo',
      GB: 'BDS',
      GQ: 'QZSS',
      GI: 'NavIC'
    };
    return map[talkerId] || 'Unknown';
  }

  /**
   * Get signal name from talker ID and signal ID
   */
  getSignalName(talkerId, signalId) {
    if (!signalId || !this.signalIdMap[talkerId]) return '';
    return this.signalIdMap[talkerId][signalId] || `Signal ${signalId}`;
  }

  /**
   * Parse all NMEA content and return structured data
   */
  parseContent(content) {
    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const data = {
      gga: [],
      gst: [],
      gsa: [],
      gsv: [],
      rmc: [],
      vtg: []
    };

    // GSV multi-message reassembly
    const gsvEpochBuffer = {};
    let lastGgaTimestamp = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('$')) continue;

      const parsed = this.parse(trimmed);
      if (!parsed) continue;

      const now = new Date();

      switch (parsed.type) {
        case 'GGA':
          lastGgaTimestamp = parsed.timestamp;
          data.gga.push({ ...parsed, parseTime: now });
          break;
        case 'GST':
          data.gst.push({ ...parsed, parseTime: now, timestamp: lastGgaTimestamp || parsed.timestamp });
          break;
        case 'GSA':
          data.gsa.push({ ...parsed, parseTime: now, timestamp: lastGgaTimestamp });
          break;
        case 'GSV': {
          // Reassemble multi-message GSV
          const key = `${parsed.talkerId}_${parsed.signalId}`;
          if (!gsvEpochBuffer[key]) {
            gsvEpochBuffer[key] = {
              talkerId: parsed.talkerId,
              constellation: parsed.constellation,
              signalId: parsed.signalId,
              signalName: parsed.signalName,
              totalMessages: parsed.totalMessages,
              satellitesInView: parsed.satellitesInView,
              messages: {}
            };
          }
          gsvEpochBuffer[key].messages[parsed.messageNumber] = parsed.satellites;
          gsvEpochBuffer[key].satellitesInView = parsed.satellitesInView;

          // Check if all messages received
          if (Object.keys(gsvEpochBuffer[key].messages).length === parsed.totalMessages) {
            // Merge all satellites
            const allSatellites = [];
            for (let i = 1; i <= parsed.totalMessages; i++) {
              if (gsvEpochBuffer[key].messages[i]) {
                allSatellites.push(...gsvEpochBuffer[key].messages[i]);
              }
            }
            data.gsv.push({
              type: 'GSV',
              talkerId: parsed.talkerId,
              constellation: parsed.constellation,
              signalId: parsed.signalId,
              signalName: parsed.signalName,
              satellitesInView: parsed.satellitesInView,
              satellites: allSatellites,
              parseTime: now,
              timestamp: lastGgaTimestamp
            });
            delete gsvEpochBuffer[key];
          }
          break;
        }
        case 'RMC':
          data.rmc.push({ ...parsed, parseTime: now });
          break;
        case 'VTG':
          data.vtg.push({ ...parsed, parseTime: now });
          break;
      }
    }

    return data;
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NMEAParser;
}
