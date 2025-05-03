import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Get the wallet address from the query parameters
  const searchParams = request.nextUrl.searchParams;
  const userAddress = searchParams.get("userAddress");

  if (!userAddress) {
    return NextResponse.json(
      { error: "Missing userAddress parameter" },
      { status: 400 },
    );
  }

  try {
    // Make the request to the Veda API from the server side
    const apiUrl = `https://app.veda.tech/api/user-veda-points?userAddress=${userAddress}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `Veda API returned ${response.status}: ${response.statusText}`,
      );
    }

    // Parse the JSON response
    const data = await response.json();

    // Return the data to the client
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Veda points:", error);
    return NextResponse.json(
      { error: "Failed to fetch Veda points data" },
      { status: 500 },
    );
  }
}
