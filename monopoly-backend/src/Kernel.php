<?php

declare(strict_types=1);

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

/**
 * Application Kernel - Main entry point for Symfony application.
 * 
 * Manages bundle configuration, service container compilation,
 * and request/response handling for the Monopoly game backend.
 */
class Kernel extends BaseKernel
{
    use MicroKernelTrait;
}

