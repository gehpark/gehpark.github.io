const STOP_IDS = {
  franklin: 'A45N', // franklin to manhattan
  nostrand: 'A46N'  // nostrand to manhattan
};

// --------------------------------------------------------- //


// Express.js server example to serve this data to your frontend
const app = express();
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import esMain from 'es-main';
 

app.use(cors()); // Enable CORS for your frontend

app.get('/api/trains', async (req, res) => {
  try {
    const arrivals = await getTrainArrivals();
    res.json({
      success: true,
      data: arrivals,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Access train data at: <host>:${PORT}/api/trains`);
});

if (esMain(import.meta)) {
  // Module run directly.
    getTrainArrivals();
}

// --------------------------------------------------------- //


async function fetchMTAData() {
    const MTA_API_URL = 'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2Fgtfs-ace';

    try {
        const response = await fetch(MTA_API_URL);
        const buffer = await response.arrayBuffer();
        const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
          new Uint8Array(buffer)
        );
        return feed;
      } catch (error) {
        console.error('Error fetching MTA data:', error);
        throw error;
      }
}


function parseTrainArrivals(feed) {
  const now = Math.floor(Date.now() / 1000); // Current time in Unix timestamp
  const arrivals = {
    franklin: [],
    nostrand: []
  };

  // Iterate through all entities in the feed
  feed.entity.forEach(entity => {
    // Check if this entity has trip updates
    if (!entity.tripUpdate) return;

    const trip = entity.tripUpdate.trip;
    const stopTimeUpdates = entity.tripUpdate.stopTimeUpdate;

    // Filter for AC trains only
    if (trip.routeId !== 'A' && trip.routeId != 'C') return;
    // if (trip.direction !== 'Manhattan') return;

    // Look through stop time updates for Franklin Ave
    stopTimeUpdates.forEach(stopTime => {
      const stopId = stopTime.stopId;
      
      if (stopId === STOP_IDS.franklin || 
          stopId === STOP_IDS.nostrand) {
        
        // Get arrival time (prefer arrival, fallback to departure)
        const arrivalTime = stopTime.arrival?.time || stopTime.departure?.time;
        
        if (!arrivalTime) return;

        // Calculate minutes until arrival
        const minutesUntilArrival = (arrivalTime - now) / 60;

        // Only include trains arriving in the future (within next 30 minutes)
        if (minutesUntilArrival >= 0 && minutesUntilArrival <= 30) {
          const arrivalInfo = {
            minutes: minutesUntilArrival,
            arrivalTime: new Date(arrivalTime * 1000),
            tripId: trip.tripId,
            routeId: trip.routeId,
            direction: getStationText(stopId),
          };

          // Add to appropriate array
          if (stopId === STOP_IDS.franklin) {
            arrivals.franklin.push(arrivalInfo);
          } else {
            arrivals.nostrand.push(arrivalInfo);
          }
        }
      }
    });
  });

  // Sort by arrival time (soonest first)
  arrivals.franklin.sort((a, b) => a.minutes - b.minutes);
  if (arrivals.franklin.length > 2) { 
    arrivals.franklin = arrivals.franklin.slice(0,2);
  }
  arrivals.nostrand.sort((a, b) => a.minutes - b.minutes);
  if (arrivals.nostrand.length > 2) { 
    arrivals.nostrand = arrivals.nostrand.slice(0,3);
  }

  return arrivals;
}

function getStationText(stopId) {
  if (stopId === STOP_IDS.franklin) {
    return 'Franklin';
  } else {
    return 'Nostrand';
  }
}

// Main function to get train arrivals
async function getTrainArrivals() {
  try {
    console.log('Fetching MTA data...');
    const feed = await fetchMTAData();
    
    console.log('Parsing arrivals...');
    const arrivals = parseTrainArrivals(feed);
    
    console.log('\n=== franklin TRAINS ===');
    if (arrivals.franklin.length === 0) {
      console.log('No trains scheduled');
    } else {
      arrivals.franklin.forEach(train => {
        console.log(`${train.routeId} ${train.tripId} ${train.minutes} min (${train.arrivalTime.toLocaleTimeString()})`);
      });
    }

    console.log('\n=== nostrand TRAINS ===');
    if (arrivals.nostrand.length === 0) {
      console.log('No trains scheduled');
    } else {
      arrivals.nostrand.forEach(train => {
        console.log(`${train.routeId} ${train.tripId} ${train.minutes} min (${train.arrivalTime.toLocaleTimeString()})`);
      });
    }

    return arrivals;
  } catch (error) {
    console.error('Error getting train arrivals:', error);
    throw error;
  }
}
