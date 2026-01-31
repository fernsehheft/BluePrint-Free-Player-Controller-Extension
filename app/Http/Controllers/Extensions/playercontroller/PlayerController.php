<?php

namespace Pterodactyl\BlueprintFramework\Extensions\playercontroller;

use Pterodactyl\Http\Controllers\Controller;
use Pterodactyl\Http\Requests\Api\Client\ClientApiRequest;

class PlayerController extends Controller
{
    /**
     * Placeholder index method.
     */
    public function index(ClientApiRequest $request)
    {
        return response()->json(['status' => 'success']);
    }
}
