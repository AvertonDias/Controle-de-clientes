import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Client, DeliveryRoute } from '../types';
import { MapPin, Navigation, Compass } from 'lucide-react';

interface MapComponentProps {
  clients: Client[];
  activeRoute?: DeliveryRoute | null;
  onSelectCoordinates?: (coords: { lat: number; lng: number; address?: string }) => void;
  isSelectingCoords?: boolean;
  selectedCoords?: { lat: number; lng: number } | null;
  heightClass?: string;
}

export default function MapComponent({
  clients,
  activeRoute,
  onSelectCoordinates,
  isSelectingCoords = false,
  selectedCoords = null,
  heightClass = "h-[400px] md:h-full"
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLinesGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Use a default location in Brazil (São Paulo) if no other coordinates exist
    const defaultLat = -23.55052;
    const defaultLng = -46.633308;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      fadeAnimation: true,
    }).setView([defaultLat, defaultLng], 13);

    // Modern clean map style from CartoDB (Positron) - perfect for professional business apps
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    mapRef.current = map;
    markersGroupRef.current = L.layerGroup().addTo(map);
    routeLinesGroupRef.current = L.layerGroup().addTo(map);

    // Register click event for selecting location
    map.on('click', (e: L.LeafletMouseEvent) => {
      // We check ref instead of state to avoid stale closure issues
      if (mapRef.current) {
        const { lat, lng } = e.latlng;
        // Attempt to reverse geocode using OpenStreetMap Nominatim
        triggerReverseGeocoding(lat, lng);
      }
    });

    // Check user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserCoords(coords);
          if (mapRef.current && clients.length === 0 && !selectedCoords && !activeRoute) {
            mapRef.current.setView([coords.lat, coords.lng], 14);
          }
        },
        () => console.log('Location access denied or unavailable.')
      );
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Sync isSelectingCoords ref behavior for clicks
  const clickCallbackRef = useRef<typeof onSelectCoordinates>(onSelectCoordinates);
  clickCallbackRef.current = onSelectCoordinates;
  const isSelectingRef = useRef(isSelectingCoords);
  isSelectingRef.current = isSelectingCoords;

  const triggerReverseGeocoding = async (lat: number, lng: number) => {
    if (!isSelectingRef.current || !clickCallbackRef.current) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'pt-BR' } }
      );
      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        clickCallbackRef.current({ lat, lng, address });
      } else {
        clickCallbackRef.current({ lat, lng, address: `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}` });
      }
    } catch (error) {
      clickCallbackRef.current!({ lat, lng, address: `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    }
  };

  // Center on user position helper
  const centerOnUser = () => {
    if (userCoords && mapRef.current) {
      mapRef.current.setView([userCoords.lat, userCoords.lng], 16);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserCoords(coords);
        mapRef.current?.setView([coords.lat, coords.lng], 16);
      });
    }
  };

  // Draw user's GPS position
  useEffect(() => {
    if (!mapRef.current || !userCoords) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
    } else {
      const userIcon = L.divIcon({
        className: 'custom-user-marker',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-5 h-5 bg-sky-500 rounded-full animate-ping opacity-75"></div>
            <div class="relative w-4 h-4 bg-sky-600 border-2 border-white rounded-full shadow-md"></div>
          </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup('Sua localização atual');
    }
  }, [userCoords]);

  // Sync Markers and Route Line
  useEffect(() => {
    const map = mapRef.current;
    const markersGroup = markersGroupRef.current;
    const routeLinesGroup = routeLinesGroupRef.current;
    if (!map || !markersGroup || !routeLinesGroup) return;

    markersGroup.clearLayers();
    routeLinesGroup.clearLayers();

    const bounds: L.LatLngExpression[] = [];

    // 1. Draw Selected Coords Maker (when creating a client)
    if (isSelectingCoords && selectedCoords) {
      bounds.push([selectedCoords.lat, selectedCoords.lng]);

      const selectIcon = L.divIcon({
        className: 'custom-pin-selecting',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white shadow-lg border-2 border-white transform -translate-y-2 animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      L.marker([selectedCoords.lat, selectedCoords.lng], { icon: selectIcon })
        .addTo(markersGroup)
        .bindPopup('Localização selecionada para o cliente')
        .openPopup();
    }

    // 2. Draw Client Markers
    clients.forEach((client) => {
      const { lat, lng } = client.coordinates;
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;

      bounds.push([lat, lng]);

      // Check if client is in the active route and what status they have
      let ringColor = 'bg-slate-600';
      let pinColor = 'bg-slate-500';
      let routeBadge = '';

      if (activeRoute) {
        const routeItemIdx = activeRoute.items.findIndex(item => item && item.clientId === client.id);
        if (routeItemIdx !== -1) {
          const routeItem = activeRoute.items[routeItemIdx];
          if (routeItem) {
            const displaySeq = activeRoute.optimizedOrder && activeRoute.optimizedOrder.length > 0
              ? activeRoute.optimizedOrder.indexOf(routeItemIdx) + 1
              : routeItemIdx + 1;
  
            routeBadge = `<div class="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full border border-white shadow-sm">${displaySeq}</div>`;
  
            if (routeItem.status === 'delivered') {
              ringColor = 'bg-emerald-500 animate-pulse';
              pinColor = 'bg-emerald-600';
            } else if (routeItem.status === 'failed') {
              ringColor = 'bg-rose-500';
              pinColor = 'bg-rose-600';
            } else {
              ringColor = 'bg-amber-400';
              pinColor = 'bg-amber-500';
            }
          }
        }
      }

      const clientIcon = L.divIcon({
        className: 'custom-client-marker',
        html: `
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full ${ringColor} p-0.5 shadow-md">
            <div class="flex items-center justify-center w-full h-full rounded-full ${pinColor} text-white font-semibold text-xs border border-white">
              ${client.name.substring(0, 2).toUpperCase()}
            </div>
            ${routeBadge}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -10]
      });

      const popupContent = `
        <div class="p-1 min-w-[180px]">
          <h3 class="font-bold text-sm text-slate-800">${client.name}</h3>
          <p class="text-xs text-slate-500 mt-0.5"><strong class="text-slate-600">Endereço:</strong> ${client.address}</p>
          <p class="text-xs text-slate-500 mt-0.5"><strong class="text-slate-600">Tel:</strong> ${client.phone}</p>
          ${activeRoute && activeRoute.items.filter(i => i).some(i => i.clientId === client.id) ? `
            <div class="mt-2 pt-1 border-t border-slate-100 flex items-center justify-between">
              <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                activeRoute.items.filter(i => i).find(i => i.clientId === client.id)?.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' :
                activeRoute.items.filter(i => i).find(i => i.clientId === client.id)?.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
              }">
                Entrega: ${
                  activeRoute.items.filter(i => i).find(i => i.clientId === client.id)?.status === 'delivered' ? 'Entregue' :
                  activeRoute.items.filter(i => i).find(i => i.clientId === client.id)?.status === 'failed' ? 'Falhou' : 'Pendente'
                }
              </span>
            </div>
          ` : ''}
        </div>
      `;

      L.marker([lat, lng], { icon: clientIcon })
        .addTo(markersGroup)
        .bindPopup(popupContent);
    });

    // 3. Draw Depot Starting Point (if routing is active)
    if (activeRoute) {
      const { lat, lng } = activeRoute.startCoordinates;
      bounds.push([lat, lng]);

      const depotIcon = L.divIcon({
        className: 'custom-depot-marker',
        html: `
          <div class="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white shadow-lg border-2 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([lat, lng], { icon: depotIcon })
        .addTo(markersGroup)
        .bindPopup(`
          <div class="p-1">
            <h3 class="font-bold text-sm text-slate-900">Ponto de Partida / Depósito</h3>
            <p class="text-xs text-slate-500 mt-0.5">${activeRoute.startAddress}</p>
          </div>
        `);

      // Draw Route Line
      // Compile the points in ordered sequence (Starting Depot -> Client 1 -> Client 2 -> Client N -> Depot)
      const pointsInOrder: [number, number][] = [[lat, lng]];
      
      const order = activeRoute.optimizedOrder && activeRoute.optimizedOrder.length > 0 
        ? activeRoute.optimizedOrder 
        : activeRoute.items.map((_, i) => i);

      order.forEach((index) => {
        const item = activeRoute.items[index];
        if (item) {
          const client = clients.find(c => c.id === item.clientId);
          if (client && client.coordinates) {
            pointsInOrder.push([client.coordinates.lat, client.coordinates.lng]);
          }
        }
      });

      // Close route back to start point
      pointsInOrder.push([lat, lng]);

      // Call OSRM API for beautiful street-level routes
      drawStreetRoute(pointsInOrder, routeLinesGroup, map);
    }

    // Auto-fit bounds with some padding
    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], maxZoom: 16 });
      } catch (err) {
        console.error('Error fitting bounds', err);
      }
    }
  }, [clients, activeRoute, selectedCoords, isSelectingCoords]);

  // Fetch actual roads using OpenStreetMap OSRM Routing API
  const drawStreetRoute = async (points: [number, number][], group: L.LayerGroup, map: L.Map) => {
    if (points.length < 2) return;

    setLoadingRoute(true);

    try {
      // Build coordinates query: lng,lat;lng,lat...
      const coordsQuery = points.map(p => `${p[1]},${p[0]}`).join(';');
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordsQuery}?overview=full&geometries=geojson`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const routeGeoJSON = data.routes[0].geometry;
          
          // Draw the beautiful exact road line in indigo/violet
          const streetLine = L.geoJSON(routeGeoJSON, {
            style: {
              color: '#4f46e5',
              weight: 5,
              opacity: 0.85,
              dashArray: '1, 2', // Dash effect for active delivery path
              lineCap: 'round',
              lineJoin: 'round'
            }
          }).addTo(group);

          // Add a shadow line underneath for depth
          L.geoJSON(routeGeoJSON, {
            style: {
              color: '#312e81',
              weight: 8,
              opacity: 0.25,
              lineCap: 'round',
              lineJoin: 'round'
            }
          }).addTo(group);

          setLoadingRoute(false);
          return;
        }
      }
    } catch (e) {
      console.warn('OSRM routing failed, falling back to straight lines', e);
    }

    // Fallback: draw standard straight lines
    L.polyline(points, {
      color: '#4f46e5',
      weight: 4,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(group);

    setLoadingRoute(false);
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-inner bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col">
      {isSelectingCoords && (
        <div className="bg-indigo-50/90 dark:bg-indigo-950/80 border-b border-indigo-100 dark:border-indigo-900/50 px-4 py-2.5 flex items-center gap-2 text-xs text-indigo-700 dark:text-indigo-300 font-bold z-20 no-select">
          <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 animate-bounce" />
          <span>Toque no mapa para selecionar o local desejado</span>
        </div>
      )}

      <div ref={mapContainerRef} className={`w-full flex-grow ${heightClass} z-10`} />

      {/* Map Control Overlay */}
      <div className={`absolute ${isSelectingCoords ? 'top-14' : 'top-3'} right-3 z-20 flex flex-col gap-2 no-select`}>
        {userCoords && (
          <button
            onClick={centerOnUser}
            className="flex items-center justify-center w-10 h-10 bg-white hover:bg-slate-50 text-slate-700 hover:text-sky-600 rounded-xl shadow-lg border border-slate-100 transition-all duration-200"
            title="Minha Localização"
          >
            <Compass className="w-5 h-5 animate-pulse" />
          </button>
        )}
      </div>

      {loadingRoute && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-slate-900/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full shadow-md flex items-center gap-2 text-xs font-medium">
          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Calculando rota nas ruas...</span>
        </div>
      )}
    </div>
  );
}
