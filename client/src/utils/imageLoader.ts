import { Element } from '../types';

export interface ElementImages {
  [key: string]: HTMLImageElement[];
}

export interface AvatarImages {
  [key: string]: HTMLImageElement | null;
}

export interface MaskImages {
  [key: string]: HTMLImageElement | null;
}

export interface ShadowImages {
  [key: string]: HTMLImageElement | null;
}

export class ImageLoader {
  elementImages: ElementImages = {
    dog: [],
    duck: [],
    penguin: [],
    whale: []
  };

  avatarImages: AvatarImages = {
    dog: null,
    duck: null,
    penguin: null,
    whale: null
  };

  maskImages: MaskImages = {
    dog: null,
    duck: null,
    penguin: null,
    whale: null
  };

  shadowImages: ShadowImages = {
    dog: null,
    duck: null,
    penguin: null,
    whale: null
  };

  dirtImages: HTMLImageElement[] = [];

  loadElementImages() {
    const animals = [
      {
        name: 'dog' as Element,
        folder: 'DOG',
        landFiles: ['Asset 3.png', 'Asset 4.png', 'Asset 5.png'],
        mainFile: 'Asset 43.png',
        maskFile: 'Asset 41.png',
        shadowFile: 'Asset 50.png'
      },
      {
        name: 'duck' as Element,
        folder: 'DUCK',
        landFiles: ['Asset 7.png', 'Asset 8.png', 'Asset 9.png'],
        mainFile: 'Asset 30.png',
        maskFile: 'Asset 31.png',
        shadowFile: 'Asset 47.png'
      },
      {
        name: 'penguin' as Element,
        folder: 'PEGUIN',
        landFiles: ['Asset 17.png', 'Asset 18.png', 'Asset 19.png'],
        mainFile: 'Asset 44.png',
        maskFile: 'Asset 46.png',
        shadowFile: 'Asset 49.png'
      },
      {
        name: 'whale' as Element,
        folder: 'WHALE',
        landFiles: ['Asset 12.png', 'Asset 13.png', 'Asset 14.png'],
        mainFile: 'Asset 33.png',
        maskFile: 'Asset 34.png',
        shadowFile: 'Asset 48.png'
      }
    ];

    animals.forEach(({ name, folder, landFiles, mainFile, maskFile, shadowFile }) => {
      // Load land images
      landFiles.forEach((filename) => {
        const img = new Image();
        img.src = `/elements/NEW/${folder}/Land/${filename}`;
        img.onload = () => {
          this.elementImages[name].push(img);
        };
        img.onerror = () => {
          console.warn(`Failed to load ${name} land texture: ${filename}`);
        };
      });

      // Load main player image
      const mainImg = new Image();
      mainImg.src = `/elements/NEW/${folder}/Main/${mainFile}`;
      mainImg.onload = () => {
        this.avatarImages[name] = mainImg;
      };
      mainImg.onerror = () => {
        console.warn(`Failed to load ${name} main image: ${mainFile}`);
      };

      // Load mask image
      if (maskFile) {
        const maskImg = new Image();
        maskImg.src = `/elements/NEW/${folder}/Mask/${maskFile}`;
        maskImg.onload = () => {
          this.maskImages[name] = maskImg;
        };
        maskImg.onerror = () => {
          console.warn(`Failed to load ${name} mask image: ${maskFile}`);
        };
      }

      // Load shadow image
      if (shadowFile) {
        const shadowImg = new Image();
        shadowImg.src = `/elements/NEW/${folder}/Shadow/${shadowFile}`;
        shadowImg.onload = () => {
          this.shadowImages[name] = shadowImg;
        };
        shadowImg.onerror = () => {
          console.warn(`Failed to load ${name} shadow image: ${shadowFile}`);
        };
      }
    });
  }

  loadDirtImages() {
    const landDefaultFiles = [
      'SET 1 (1).png',
      'SET 1 (2).png',
      'SET 1 (3).png'
    ];

    landDefaultFiles.forEach((filename) => {
      const img = new Image();
      img.src = `/elements/NEW/LAND DEFAUT/${filename}`;
      img.onload = () => {
        this.dirtImages.push(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load land default texture: ${filename}`);
      };
    });
  }
}

