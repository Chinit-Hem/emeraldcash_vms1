import { NextRequest, NextResponse } from "next/server";
import { 
  getVehicles, 
  getVehicleById, 
  createVehicle, 
  updateVehicle, 
  deleteVehicle,
  getVehicleStats,
  searchVehicles 
} from "@/lib/db-schema";
import { requireSession } from "@/lib/auth";

// GET /api/vehicles-db - Get all vehicles or search
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Check if this is a search request
    const searchTerm = searchParams.get("search");
    if (searchTerm) {
      const vehicles = await searchVehicles(searchTerm);
      return NextResponse.json({ success: true, data: vehicles });
    }
    
    // Check if this is a stats request
    if (searchParams.get("stats") === "true") {
      const stats = await getVehicleStats();
      return NextResponse.json({ success: true, data: stats });
    }
    
    // Get specific vehicle by ID
    const id = searchParams.get("id");
    if (id) {
      const vehicle = await getVehicleById(parseInt(id));
      if (!vehicle) {
        return NextResponse.json(
          { success: false, error: "Vehicle not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: vehicle });
    }
    
    // Build filters from query params
    const filters = {
      category: searchParams.get("category") || undefined,
      brand: searchParams.get("brand") || undefined,
      condition: searchParams.get("condition") || undefined,
      yearMin: searchParams.get("yearMin") ? parseInt(searchParams.get("yearMin")!) : undefined,
      yearMax: searchParams.get("yearMax") ? parseInt(searchParams.get("yearMax")!) : undefined,
      priceMin: searchParams.get("priceMin") ? parseInt(searchParams.get("priceMin")!) : undefined,
      priceMax: searchParams.get("priceMax") ? parseInt(searchParams.get("priceMax")!) : undefined,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : undefined,
      offset: searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : undefined,
    };
    
    const vehicles = await getVehicles(filters);
    return NextResponse.json({ success: true, data: vehicles });
    
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

// POST /api/vehicles-db - Create a new vehicle
export async function POST(req: NextRequest) {
  // Check authentication
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Only admins can create vehicles
  if (session.role !== "Admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.vehicle_id || !body.category || !body.brand || !body.model) {
      return NextResponse.json(
        { success: false, error: "VehicleId, Category, Brand, and Model are required" },
        { status: 400 }
      );
    }

    
    const vehicle = await createVehicle({
      category: body.category,
      brand: body.brand,
      model: body.model,
      year: body.year || new Date().getFullYear(),
      plate: body.plate,
      condition: body.condition || "New",
      market_price: body.market_price || body.price_new || 0,
      tax_type: body.tax_type,
      body_type: body.body_type,
      color: body.color,
      image_id: body.image_id || body.image,
    });

    
    return NextResponse.json({ success: true, data: vehicle }, { status: 201 });
    
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create vehicle" },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles-db - Update a vehicle
export async function PUT(req: NextRequest) {
  // Check authentication
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Only admins can update vehicles
  if (session.role !== "Admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Vehicle ID is required" },
        { status: 400 }
      );
    }
    
    const body = await req.json();
    const vehicle = await updateVehicle(parseInt(id), body);
    
    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: "Vehicle not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: vehicle });
    
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update vehicle" },
      { status: 500 }
    );
  }
}

// DELETE /api/vehicles-db - Delete a vehicle
export async function DELETE(req: NextRequest) {
  // Check authentication
  const session = requireSession(req);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // Only admins can delete vehicles
  if (session.role !== "Admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }
  
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Vehicle ID is required" },
        { status: 400 }
      );
    }
    
    const deleted = await deleteVehicle(parseInt(id));
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Vehicle not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, message: "Vehicle deleted" });
    
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete vehicle" },
      { status: 500 }
    );
  }
}
